-- Function to safely delete a user account and all associated data
CREATE OR REPLACE FUNCTION delete_user_account(user_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  -- Delete user files (this will also remove pinning data due to cascade)
  DELETE FROM files WHERE user_id = user_id_param;
  
  -- Delete pinning secrets
  DELETE FROM pinning_secrets WHERE user_id = user_id_param;
  
  -- Delete billing history
  DELETE FROM billing_history WHERE user_id = user_id_param;
  
  -- Delete user record (this should be last)
  DELETE FROM users WHERE id = user_id_param;
  
  -- Log the account deletion (optional, for audit purposes)
  INSERT INTO audit_log (action, user_id, details, created_at)
  VALUES ('account_deleted', user_id_param, 'User account and all data deleted', NOW());
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL for functions
    RAISE EXCEPTION 'Failed to delete user account: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 