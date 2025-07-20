-- ========================================================
-- COMPLETE MIGRATION: Remove plan_type from users table
-- ========================================================
-- This migration safely removes the plan_type column from the users table
-- by first updating all dependent objects to use the subscriptions table.
--
-- Dependencies to handle:
-- 1. trigger_update_storage_limits trigger
-- 2. user_current_plans view
--
-- To run this migration:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this SQL
-- 4. Execute the query
-- ========================================================

-- Step 1: Update the storage limits trigger to use subscriptions table
-- ========================================================
DROP TRIGGER IF EXISTS trigger_update_storage_limits ON users;
DROP FUNCTION IF EXISTS update_storage_limits_from_plan();

-- Create new function that gets plan from subscriptions table
CREATE OR REPLACE FUNCTION update_storage_limits_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
  user_plan_type TEXT;
BEGIN
  -- Get plan type from subscriptions table (single source of truth)
  SELECT plan_type INTO user_plan_type
  FROM subscriptions 
  WHERE user_id = NEW.id 
    AND status = 'active'
  LIMIT 1;
  
  -- Default to 'free' if no active subscription found
  user_plan_type = COALESCE(user_plan_type, 'free');
  
  -- Update storage limits based on plan type
  IF user_plan_type = 'free' THEN
    NEW.storage_limit = 10485760; -- 10MB
  ELSIF user_plan_type = 'pro' THEN
    NEW.storage_limit = 52428800; -- 50MB  
  ELSIF user_plan_type = 'enterprise' THEN
    NEW.storage_limit = 1073741824; -- 1GB
  ELSE
    NEW.storage_limit = 10485760; -- Default to free
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger that uses subscriptions table
CREATE TRIGGER trigger_update_storage_limits_from_subscription
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_limits_from_subscription();

-- Step 2: Update the user_current_plans view to use subscriptions only
-- ========================================================
DROP VIEW IF EXISTS user_current_plans;

-- Create new view that uses subscriptions as single source of truth
CREATE OR REPLACE VIEW user_current_plans AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(s.plan_type, 'free') as current_plan,
  s.plan_type as subscription_plan,
  s.status as subscription_status,
  s.stripe_subscription_id,
  CASE 
    WHEN s.status = 'active' THEN 'subscription'
    ELSE 'default_free'
  END as plan_source,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active';

-- Step 3: Update the get_user_plan function to use subscriptions only
-- ========================================================
DROP FUNCTION IF EXISTS get_user_plan(TEXT);

CREATE OR REPLACE FUNCTION get_user_plan(p_user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  subscription_plan TEXT;
BEGIN
  -- Get plan from subscriptions table (single source of truth)
  SELECT plan_type INTO subscription_plan
  FROM subscriptions 
  WHERE user_id = p_user_id 
    AND status = 'active'
  LIMIT 1;
  
  -- Return subscription plan or default to 'free'
  RETURN COALESCE(subscription_plan, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Drop the sync trigger if it exists (no longer needed)
-- ========================================================
DROP TRIGGER IF EXISTS trigger_sync_user_plan ON subscriptions;
DROP FUNCTION IF EXISTS sync_user_plan_from_subscription();

-- Step 5: Verify all users have subscription records before proceeding
-- ========================================================
DO $$
DECLARE
    user_count INTEGER;
    subscription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(DISTINCT user_id) INTO subscription_count FROM subscriptions;
    
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Users with subscriptions: %', subscription_count;
    
    IF user_count != subscription_count THEN
        RAISE EXCEPTION 'Not all users have subscription records! Cannot proceed with migration.';
    ELSE
        RAISE NOTICE 'All users have subscription records. Safe to proceed.';
    END IF;
END $$;

-- Step 6: Remove the plan_type column from users table
-- ========================================================
ALTER TABLE users DROP COLUMN plan_type;

-- Step 7: Update table comment
-- ========================================================
COMMENT ON TABLE users IS 'User accounts - plan information is stored in subscriptions table';

-- Step 8: Verify migration success
-- ========================================================
DO $$
BEGIN
    -- Check that column was removed
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'plan_type'
    ) THEN
        RAISE EXCEPTION 'Failed to remove plan_type column from users table';
    END IF;
    
    -- Check that view works
    PERFORM * FROM user_current_plans LIMIT 1;
    
    -- Check that function works
    PERFORM get_user_plan('test');
    
    RAISE NOTICE '🎉 SUCCESS: Migration completed successfully!';
    RAISE NOTICE '✅ plan_type column removed from users table';
    RAISE NOTICE '✅ Storage limits trigger updated to use subscriptions';  
    RAISE NOTICE '✅ user_current_plans view updated to use subscriptions';
    RAISE NOTICE '✅ get_user_plan function updated to use subscriptions';
    RAISE NOTICE '📋 Subscriptions table is now the SINGLE source of truth';
END $$; 