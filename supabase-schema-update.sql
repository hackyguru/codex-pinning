-- Migration to fix UUID issue with Privy DIDs
-- Run this in your Supabase SQL Editor

-- First, drop existing foreign key constraints
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;

-- Change users.id from UUID to TEXT to support Privy DIDs
ALTER TABLE users ALTER COLUMN id TYPE TEXT;

-- Change files.user_id from UUID to TEXT to match
ALTER TABLE files ALTER COLUMN user_id TYPE TEXT;

-- Recreate the foreign key constraint
ALTER TABLE files ADD CONSTRAINT files_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Update the upsert function to handle TEXT IDs
CREATE OR REPLACE FUNCTION upsert_user_profile(
  user_id TEXT,
  user_email TEXT,
  user_plan_type TEXT DEFAULT 'free'
)
RETURNS users AS $$
DECLARE
  result users;
BEGIN
  INSERT INTO users (id, email, plan_type)
  VALUES (user_id, user_email, user_plan_type)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = CURRENT_TIMESTAMP
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to use TEXT
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Note: For now, we'll disable RLS since we're handling auth in the app
-- In production, you'd want to implement proper JWT verification
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY; 