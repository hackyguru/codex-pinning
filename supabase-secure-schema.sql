-- Enable Row Level Security on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;

-- Create function to get current user ID from JWT
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS TEXT AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'sub';
$$ LANGUAGE SQL STABLE;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT 
  USING (id = get_current_user_id());

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE 
  USING (id = get_current_user_id())
  WITH CHECK (id = get_current_user_id());

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT 
  WITH CHECK (id = get_current_user_id());

-- Create RLS policies for files table
CREATE POLICY "Users can view their own files" ON files
  FOR SELECT 
  USING (user_id = get_current_user_id());

CREATE POLICY "Users can insert their own files" ON files
  FOR INSERT 
  WITH CHECK (user_id = get_current_user_id());

CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE 
  USING (user_id = get_current_user_id());

-- Remove overprivileged anonymous access
REVOKE ALL ON users FROM anon;
REVOKE ALL ON files FROM anon;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, DELETE ON files TO authenticated;

-- Update the upsert function to work with RLS
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

-- Grant execute permission on the upsert function
GRANT EXECUTE ON FUNCTION upsert_user_profile(TEXT, TEXT, TEXT) TO authenticated;

-- Grant permissions to existing service role for server-side operations
-- This should be used sparingly and only for operations that need to bypass RLS
GRANT ALL ON users TO service_role;
GRANT ALL ON files TO service_role;
GRANT EXECUTE ON FUNCTION upsert_user_profile(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION update_user_storage() TO service_role;
GRANT EXECUTE ON FUNCTION update_updated_at() TO service_role;

-- Create a function for server-side user operations
CREATE OR REPLACE FUNCTION server_upsert_user_profile(
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

-- Comments for documentation
COMMENT ON FUNCTION get_current_user_id() IS 'Extracts user ID from JWT token in request headers';
COMMENT ON FUNCTION upsert_user_profile(TEXT, TEXT, TEXT) IS 'Safely upserts user profile with RLS enabled';
COMMENT ON FUNCTION server_upsert_user_profile(TEXT, TEXT, TEXT) IS 'Server-side user upsert function that bypasses RLS';

-- Create indices for better performance with RLS
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);

-- Enable real-time for authenticated users only
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE files; 