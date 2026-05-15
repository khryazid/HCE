-- 003_get_user_by_email.sql
-- Function to allow service role to get a user ID by email securely without exposing auth.users

CREATE OR REPLACE FUNCTION get_user_id_by_email(email_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id FROM auth.users WHERE email = email_input LIMIT 1;
  RETURN found_id;
END;
$$;
