-- ========================================================
-- MIGRATION: Remove plan_type from users table
-- ========================================================
-- This migration removes the plan_type column from the users table
-- since the subscriptions table is now the single source of truth.
--
-- IMPORTANT: Run this ONLY after confirming all code has been updated
-- to use the subscriptions table for plan information.
--
-- To run this migration:
-- 1. Go to your Supabase dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this SQL
-- 4. Execute the query
-- ========================================================

-- First, verify that all users have corresponding subscription records
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

-- Remove the plan_type column from users table
-- This will make subscriptions.plan_type the ONLY source of truth
ALTER TABLE users DROP COLUMN IF EXISTS plan_type;

-- Update the users table comment to reflect the change
COMMENT ON TABLE users IS 'User accounts - plan information is stored in subscriptions table';

-- Verify the column was removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'plan_type'
    ) THEN
        RAISE EXCEPTION 'Failed to remove plan_type column from users table';
    ELSE
        RAISE NOTICE 'SUCCESS: plan_type column removed from users table';
        RAISE NOTICE 'Subscriptions table is now the SINGLE source of truth for user plans';
    END IF;
END $$; 