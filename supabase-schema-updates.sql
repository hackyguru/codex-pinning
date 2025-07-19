-- =================================================================
-- SUPABASE SCHEMA UPDATES FOR SUBSCRIPTION-FIRST ARCHITECTURE
-- =================================================================
-- Run these SQL commands in your Supabase SQL editor
-- These changes support the new unified plan detection system

-- 1. Add database function to get user's current plan (matches TypeScript logic)
-- =================================================================
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  subscription_plan TEXT;
  user_plan TEXT;
BEGIN
  -- First check subscriptions table (source of truth)
  SELECT plan_type INTO subscription_plan
  FROM subscriptions 
  WHERE user_id = p_user_id 
    AND status = 'active'
  LIMIT 1;
  
  -- If active subscription found, return that plan
  IF subscription_plan IS NOT NULL THEN
    RETURN subscription_plan;
  END IF;
  
  -- Fallback to users table for backward compatibility
  SELECT plan_type INTO user_plan
  FROM users 
  WHERE id = p_user_id;
  
  -- Return user plan or default to 'free'
  RETURN COALESCE(user_plan, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add trigger to sync users.plan_type when subscriptions change
-- =================================================================
CREATE OR REPLACE FUNCTION sync_user_plan_from_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT or UPDATE of active subscription
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'active') THEN
    UPDATE users 
    SET 
      plan_type = NEW.plan_type,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  END IF;
  
  -- On UPDATE when subscription becomes inactive or DELETE
  IF (TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status != 'active') 
     OR TG_OP = 'DELETE' THEN
    -- Check if user has any other active subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) 
        AND status = 'active' 
        AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      -- No other active subscriptions, downgrade to free
      UPDATE users 
      SET 
        plan_type = 'free',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = COALESCE(NEW.user_id, OLD.user_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_sync_user_plan ON subscriptions;
CREATE TRIGGER trigger_sync_user_plan
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_plan_from_subscription();

-- 3. Add view for easy access to current user plans
-- =================================================================
CREATE OR REPLACE VIEW user_current_plans AS
SELECT 
  u.id as user_id,
  u.email,
  get_user_plan(u.id) as current_plan,
  u.plan_type as users_table_plan,
  s.plan_type as subscription_plan,
  s.status as subscription_status,
  s.stripe_subscription_id,
  CASE 
    WHEN s.status = 'active' THEN 'subscription'
    WHEN u.plan_type IS NOT NULL THEN 'users_table'
    ELSE 'default_free'
  END as plan_source
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active';

-- 4. Add performance indexes
-- =================================================================
-- Index for faster plan lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_plan_status 
ON subscriptions(user_id, plan_type, status);

-- Index for active subscriptions (most common query)
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_status 
ON subscriptions(status) WHERE status = 'active';

-- Composite index for webhook operations
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_status 
ON subscriptions(stripe_subscription_id, status);

-- 5. Add data consistency constraints
-- =================================================================
-- Ensure only one active subscription per user per plan type
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active_unique
ON subscriptions(user_id, plan_type) 
WHERE status = 'active';

-- 6. Add helper function for storage limit based on current plan
-- =================================================================
CREATE OR REPLACE FUNCTION get_user_storage_limit(p_user_id TEXT)
RETURNS BIGINT AS $$
DECLARE
  current_plan TEXT;
BEGIN
  current_plan := get_user_plan(p_user_id);
  
  CASE current_plan
    WHEN 'free' THEN RETURN 10485760;      -- 10MB
    WHEN 'pro' THEN RETURN 52428800;       -- 50MB  
    WHEN 'enterprise' THEN RETURN 1073741824; -- 1GB
    ELSE RETURN 10485760;                   -- Default to free
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update storage limits trigger to use new function
-- =================================================================
CREATE OR REPLACE FUNCTION update_storage_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update storage limit based on current plan (using our new function)
  NEW.storage_limit := get_user_storage_limit(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add RLS policies for the new view
-- =================================================================
-- Enable RLS on the view
ALTER VIEW user_current_plans SET (security_barrier = true);

-- Create policy for the view (users can see their own data)
-- Note: Views inherit policies from underlying tables, but this is explicit
-- DROP POLICY IF EXISTS "Users can view their current plan" ON user_current_plans;
-- CREATE POLICY "Users can view their current plan" ON user_current_plans
--   FOR SELECT USING (auth.uid()::text = user_id);

-- 9. Add data validation function
-- =================================================================
CREATE OR REPLACE FUNCTION validate_subscription_consistency()
RETURNS TABLE(user_id TEXT, issue TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    CASE 
      WHEN u.plan_type != get_user_plan(u.id) THEN 
        'Plan mismatch: users.plan_type=' || u.plan_type || ', actual=' || get_user_plan(u.id)
      WHEN u.plan_type IN ('pro', 'enterprise') AND NOT EXISTS (
        SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
      ) THEN 
        'User has paid plan but no active subscription'
      ELSE NULL
    END
  FROM users u
  WHERE 
    u.plan_type != get_user_plan(u.id)
    OR (
      u.plan_type IN ('pro', 'enterprise') 
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- VERIFICATION QUERIES (run these to test)
-- =================================================================

-- Check current plan detection for all users
-- SELECT * FROM user_current_plans;

-- Find any data inconsistencies  
-- SELECT * FROM validate_subscription_consistency();

-- Test the get_user_plan function
-- SELECT id, email, get_user_plan(id) as detected_plan FROM users LIMIT 5;

-- =================================================================
-- COMPLETED! Your database now supports the new architecture
-- ================================================================= 