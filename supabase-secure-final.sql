-- SECURE DATABASE SCHEMA WITH RLS FOR PRIVY DIDs
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing tables and start fresh
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS users CASCADE;
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
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  cid TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_upload_date ON files(upload_date DESC);
CREATE INDEX idx_files_cid ON files(cid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan_type ON users(plan_type);

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Step 9: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Step 10: Create a function to get current user ID from JWT
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Try to get user ID from JWT claims
  RETURN COALESCE(
    auth.jwt() ->> 'sub',
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    current_setting('request.jwt.claims', true)::json ->> 'userId'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (id = get_current_user_id());

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (id = get_current_user_id());

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (id = get_current_user_id());

CREATE POLICY "Users can delete their own data" ON users
  FOR DELETE USING (id = get_current_user_id());

-- Step 12: Create RLS policies for files table
CREATE POLICY "Users can view their own files" ON files
  FOR SELECT USING (user_id = get_current_user_id());

CREATE POLICY "Users can insert their own files" ON files
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can update their own files" ON files
  FOR UPDATE USING (user_id = get_current_user_id());

CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE USING (user_id = get_current_user_id());

-- Step 13: Create service role bypass policies (for server-side operations)
CREATE POLICY "Service role can access all users" ON users
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can access all files" ON files
  FOR ALL USING (current_setting('role') = 'service_role');

-- Step 14: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_storage() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at() TO anon, authenticated;

-- Step 15: Create constraints for data integrity
ALTER TABLE users ADD CONSTRAINT users_storage_used_check 
  CHECK (storage_used >= 0);

ALTER TABLE files ADD CONSTRAINT files_filename_not_empty 
  CHECK (filename != '');

ALTER TABLE files ADD CONSTRAINT files_cid_not_empty 
  CHECK (cid != '');

-- Step 16: Create function to enforce storage limits
CREATE OR REPLACE FUNCTION check_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  current_usage BIGINT;
  storage_limit BIGINT;
BEGIN
  -- Get user's plan type
  SELECT plan_type INTO user_plan 
  FROM users 
  WHERE id = NEW.user_id;
  
  -- Set storage limits based on plan
  IF user_plan = 'pro' THEN
    storage_limit := 50 * 1024 * 1024; -- 50MB
  ELSE
    storage_limit := 10 * 1024 * 1024; -- 10MB
  END IF;
  
  -- Get current usage
  SELECT storage_used INTO current_usage 
  FROM users 
  WHERE id = NEW.user_id;
  
  -- Check if adding this file would exceed the limit
  IF (current_usage + NEW.file_size) > storage_limit THEN
    RAISE EXCEPTION 'Storage limit exceeded. Current usage: % bytes, File size: % bytes, Limit: % bytes', 
      current_usage, NEW.file_size, storage_limit;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 17: Create trigger to enforce storage limits
CREATE TRIGGER trigger_check_storage_limit
  BEFORE INSERT ON files
  FOR EACH ROW
  EXECUTE FUNCTION check_storage_limit();

-- Step 18: Create view for user statistics
CREATE VIEW user_statistics AS
SELECT 
  u.id,
  u.email,
  u.plan_type,
  u.storage_used,
  CASE 
    WHEN u.plan_type = 'pro' THEN 50 * 1024 * 1024
    ELSE 10 * 1024 * 1024
  END as storage_limit,
  COUNT(f.id) as file_count,
  ROUND(
    (u.storage_used::FLOAT / 
     CASE 
       WHEN u.plan_type = 'pro' THEN 50 * 1024 * 1024
       ELSE 10 * 1024 * 1024
     END::FLOAT
    ) * 100, 2
  ) as usage_percentage
FROM users u
LEFT JOIN files f ON u.id = f.user_id
GROUP BY u.id, u.email, u.plan_type, u.storage_used;

-- Step 19: Grant access to the view
GRANT SELECT ON user_statistics TO anon, authenticated;

-- Step 20: Create RLS policy for the view
CREATE POLICY "Users can view their own statistics" ON user_statistics
  FOR SELECT USING (id = get_current_user_id());

-- Step 21: Create function to clean up orphaned files
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete files that don't have a corresponding user
  DELETE FROM files 
  WHERE user_id NOT IN (SELECT id FROM users);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 22: Create function to recalculate storage usage
CREATE OR REPLACE FUNCTION recalculate_storage_usage(user_id_param TEXT)
RETURNS VOID AS $$
DECLARE
  calculated_usage BIGINT;
BEGIN
  -- Calculate actual storage usage from files
  SELECT COALESCE(SUM(file_size), 0) INTO calculated_usage
  FROM files
  WHERE user_id = user_id_param;
  
  -- Update user's storage_used
  UPDATE users 
  SET storage_used = calculated_usage,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 23: Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION cleanup_orphaned_files() TO service_role;
GRANT EXECUTE ON FUNCTION recalculate_storage_usage(TEXT) TO service_role;

-- Step 24: Create indexes for better query performance
CREATE INDEX idx_files_user_id_file_size ON files(user_id, file_size);
CREATE INDEX idx_users_plan_type_storage_used ON users(plan_type, storage_used);

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'Secure database schema created successfully with RLS enabled!';
  RAISE NOTICE 'Users table: RLS enabled with user isolation policies';
  RAISE NOTICE 'Files table: RLS enabled with user isolation policies';
  RAISE NOTICE 'Storage limits: 10MB for free users, 50MB for pro users';
  RAISE NOTICE 'Automatic storage tracking: Enabled via triggers';
  RAISE NOTICE 'Data integrity: Enforced via constraints and triggers';
END $$; 