-- ====================================================================
-- THIRDSTORAGE - COMPLETE DATABASE SCHEMA WITH PAYMENT PLANS
-- ====================================================================
-- This file contains the complete database schema for ThirdStorage
-- Including: users, files, pinning secrets, subscriptions, and billing
-- 
-- Run this file in your Supabase SQL Editor to set up the entire database
-- ====================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS billing_history CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS pinning_secret_usage CASCADE;
DROP TABLE IF EXISTS pinning_secret_usage_daily CASCADE;
DROP TABLE IF EXISTS pinning_secrets CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing views and functions
DROP VIEW IF EXISTS pinning_secret_usage_summary;
DROP FUNCTION IF EXISTS upsert_daily_usage(UUID, DATE, INTEGER, BIGINT, INTEGER);
DROP FUNCTION IF EXISTS update_user_storage();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS upsert_user_profile(TEXT, TEXT, TEXT);

-- ====================================================================
-- CORE TABLES
-- ====================================================================

-- Users table with enhanced plan support
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  storage_used BIGINT NOT NULL DEFAULT 0,
  storage_limit BIGINT NOT NULL DEFAULT 10485760, -- 10MB in bytes for free plan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table for tracking payment plans
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  stripe_subscription_id TEXT NULL, -- Only for pro plans
  stripe_customer_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Billing history table
CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  plan_type TEXT NOT NULL,
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  cid TEXT NOT NULL,
  content_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  upload_method TEXT DEFAULT 'dashboard' CHECK (upload_method IN ('dashboard', 'api')),
  pinning_secret_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pinning secrets table
CREATE TABLE pinning_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  secret_prefix TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{"upload", "download"}',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 100,
  monthly_quota_gb INTEGER NULL,
  used_quota_gb BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimized daily usage tracking table
CREATE TABLE pinning_secret_usage_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pinning_secret_id UUID NOT NULL REFERENCES pinning_secrets(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  request_count INTEGER DEFAULT 0,
  bytes_transferred BIGINT DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan_type ON users(plan_type);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Billing history indexes
CREATE INDEX idx_billing_history_user_id ON billing_history(user_id);
CREATE INDEX idx_billing_history_subscription_id ON billing_history(subscription_id);
CREATE INDEX idx_billing_history_stripe_invoice_id ON billing_history(stripe_invoice_id);
CREATE INDEX idx_billing_history_created_at ON billing_history(created_at DESC);

-- Files indexes
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_upload_date ON files(upload_date DESC);
CREATE INDEX idx_files_cid ON files(cid);
CREATE INDEX idx_files_pinning_secret_id ON files(pinning_secret_id);

-- Pinning secrets indexes
CREATE INDEX idx_pinning_secrets_user_id ON pinning_secrets(user_id);
CREATE INDEX idx_pinning_secrets_secret_hash ON pinning_secrets(secret_hash);
CREATE INDEX idx_pinning_secrets_is_active ON pinning_secrets(is_active);

-- Daily usage indexes
CREATE INDEX idx_pinning_secret_usage_daily_secret_id ON pinning_secret_usage_daily(pinning_secret_id);
CREATE INDEX idx_pinning_secret_usage_daily_date ON pinning_secret_usage_daily(usage_date);
CREATE UNIQUE INDEX idx_pinning_secret_usage_daily_unique ON pinning_secret_usage_daily(pinning_secret_id, usage_date);

-- ====================================================================
-- FUNCTIONS AND TRIGGERS
-- ====================================================================

-- Function to update storage_used when files are inserted/deleted
CREATE OR REPLACE FUNCTION update_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users 
    SET storage_used = storage_used + NEW.file_size,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users 
    SET storage_used = storage_used - OLD.file_size,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update storage limits based on plan type
CREATE OR REPLACE FUNCTION update_storage_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update storage limits based on plan type
  IF NEW.plan_type = 'free' THEN
    NEW.storage_limit = 10485760; -- 10MB
  ELSIF NEW.plan_type = 'pro' THEN
    NEW.storage_limit = 52428800; -- 50MB
  -- Enterprise keeps existing limit (manually set)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert user profile with plan management
CREATE OR REPLACE FUNCTION upsert_user_profile(
  user_id TEXT,
  user_email TEXT,
  user_plan_type TEXT DEFAULT 'free'
)
RETURNS users AS $$
DECLARE
  result users;
  storage_limit_bytes BIGINT;
BEGIN
  -- Set storage limit based on plan
  IF user_plan_type = 'free' THEN
    storage_limit_bytes = 10485760; -- 10MB
  ELSIF user_plan_type = 'pro' THEN
    storage_limit_bytes = 52428800; -- 50MB
  ELSE
    storage_limit_bytes = 10485760; -- Default to free
  END IF;

  INSERT INTO users (id, email, plan_type, storage_limit)
  VALUES (user_id, user_email, user_plan_type, storage_limit_bytes)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP
  RETURNING * INTO result;
  
  -- Ensure subscription record exists
  INSERT INTO subscriptions (user_id, plan_type, status)
  VALUES (user_id, user_plan_type, 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for optimized daily usage aggregation
CREATE OR REPLACE FUNCTION upsert_daily_usage(
  p_secret_id UUID,
  p_usage_date DATE,
  p_request_count INTEGER DEFAULT 1,
  p_bytes_transferred BIGINT DEFAULT 0,
  p_success_count INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  INSERT INTO pinning_secret_usage_daily (
    pinning_secret_id,
    usage_date,
    request_count,
    bytes_transferred,
    success_count,
    updated_at
  ) VALUES (
    p_secret_id,
    p_usage_date,
    p_request_count,
    p_bytes_transferred,
    p_success_count,
    NOW()
  )
  ON CONFLICT (pinning_secret_id, usage_date)
  DO UPDATE SET
    request_count = pinning_secret_usage_daily.request_count + EXCLUDED.request_count,
    bytes_transferred = pinning_secret_usage_daily.bytes_transferred + EXCLUDED.bytes_transferred,
    success_count = pinning_secret_usage_daily.success_count + EXCLUDED.success_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

-- Trigger to automatically update storage_used
CREATE TRIGGER trigger_update_storage_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage();

CREATE TRIGGER trigger_update_storage_delete
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage();

-- Trigger to update storage limits when plan changes
CREATE TRIGGER trigger_update_storage_limits
  BEFORE UPDATE OF plan_type ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_limits();

-- Trigger to update updated_at on users table
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on subscriptions table
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on pinning_secrets table
CREATE TRIGGER trigger_pinning_secrets_updated_at
  BEFORE UPDATE ON pinning_secrets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on pinning_secret_usage_daily table
CREATE TRIGGER trigger_pinning_secret_usage_daily_updated_at
  BEFORE UPDATE ON pinning_secret_usage_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- VIEWS
-- ====================================================================

-- View for pinning secret usage summary
CREATE VIEW pinning_secret_usage_summary AS
SELECT 
  ps.id as secret_id,
  ps.user_id,
  ps.name as secret_name,
  COALESCE(SUM(psu.request_count), 0) as total_requests,
  COALESCE(SUM(psu.bytes_transferred), 0) as total_bytes,
  COALESCE(SUM(psu.success_count), 0) as total_success,
  CASE 
    WHEN SUM(psu.request_count) > 0 
    THEN (SUM(psu.success_count)::float / SUM(psu.request_count)) * 100 
    ELSE 0 
  END as success_rate
FROM pinning_secrets ps
LEFT JOIN pinning_secret_usage_daily psu ON ps.id = psu.pinning_secret_id
GROUP BY ps.id, ps.user_id, ps.name;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinning_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinning_secret_usage_daily ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (id = auth.uid()::text);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (id = auth.uid()::text);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Billing history policies
CREATE POLICY "Users can view their own billing history" ON billing_history
  FOR SELECT USING (user_id = auth.uid()::text);

-- Files policies
CREATE POLICY "Users can view their own files" ON files
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own files" ON files
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE USING (user_id = auth.uid()::text);

-- Pinning secrets policies
CREATE POLICY "Users can view their own pinning secrets" ON pinning_secrets
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own pinning secrets" ON pinning_secrets
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own pinning secrets" ON pinning_secrets
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own pinning secrets" ON pinning_secrets
  FOR DELETE USING (user_id = auth.uid()::text);

-- Daily usage policies
CREATE POLICY "Users can view their own pinning secret usage" ON pinning_secret_usage_daily
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pinning_secrets 
    WHERE pinning_secrets.id = pinning_secret_usage_daily.pinning_secret_id 
    AND pinning_secrets.user_id = auth.uid()::text
  )
);

-- Service role policies (for API operations)
CREATE POLICY "Service role can manage all users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all billing history" ON billing_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all files" ON files
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all pinning secrets" ON pinning_secrets
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all usage data" ON pinning_secret_usage_daily
  FOR ALL USING (auth.role() = 'service_role');

-- ====================================================================
-- PERMISSIONS
-- ====================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON subscriptions TO authenticated;
GRANT SELECT ON billing_history TO authenticated;
GRANT SELECT, INSERT, DELETE ON files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pinning_secrets TO authenticated;
GRANT SELECT ON pinning_secret_usage_daily TO authenticated;
GRANT SELECT ON pinning_secret_usage_summary TO authenticated;

-- Grant permissions to anonymous users (for public access)
GRANT SELECT ON pinning_secret_usage_summary TO anon;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION upsert_user_profile TO authenticated, anon;
GRANT EXECUTE ON FUNCTION upsert_daily_usage TO service_role;

-- ====================================================================
-- SETUP COMPLETE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ThirdStorage Database Setup Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created:';
    RAISE NOTICE '   - users (with plan-based storage limits)';
    RAISE NOTICE '   - subscriptions (Stripe integration ready)';
    RAISE NOTICE '   - billing_history (payment tracking)';
    RAISE NOTICE '   - files (with upload method tracking)';
    RAISE NOTICE '   - pinning_secrets (API authentication)';
    RAISE NOTICE '   - pinning_secret_usage_daily (optimized usage tracking)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Payment Plans:';
    RAISE NOTICE '   - Free: 10MB storage limit';
    RAISE NOTICE '   - Pro: 50MB storage limit ($10/month via Stripe)';
    RAISE NOTICE '   - Enterprise: Custom storage limit (manual billing)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Features enabled:';
    RAISE NOTICE '   - Row Level Security (RLS)';
    RAISE NOTICE '   - Automatic storage tracking';
    RAISE NOTICE '   - Plan-based storage limits';
    RAISE NOTICE '   - Stripe subscription tracking';
    RAISE NOTICE '   - Billing history tracking';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for Stripe integration!';
END $$; 