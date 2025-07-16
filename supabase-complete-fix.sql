-- COMPLETE FIX: Drop and recreate tables to handle Privy DIDs
-- Run this in your Supabase SQL Editor

-- Step 1: Drop everything to start fresh
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS upsert_user_profile(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_user_storage() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Step 2: Create users table with TEXT id (for Privy DIDs)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro')),
  storage_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create files table with TEXT user_id
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  cid TEXT NOT NULL,
  content_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_upload_date ON files(upload_date DESC);
CREATE INDEX idx_files_cid ON files(cid);
CREATE INDEX idx_users_email ON users(email);

-- Step 5: Create function to update storage_used when files are inserted/deleted
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

-- Step 6: Create triggers to automatically update storage_used
CREATE TRIGGER trigger_update_storage_insert
  AFTER INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage();

CREATE TRIGGER trigger_update_storage_delete
  AFTER DELETE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_user_storage();

-- Step 7: Create function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to update updated_at on users table
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Step 9: Create function to upsert user profile (with TEXT id)
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

-- Step 10: Disable RLS for now (we're handling auth in the app)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- Step 11: Grant necessary permissions
GRANT ALL ON users TO anon;
GRANT ALL ON files TO anon;
GRANT EXECUTE ON FUNCTION upsert_user_profile(TEXT, TEXT, TEXT) TO anon; 