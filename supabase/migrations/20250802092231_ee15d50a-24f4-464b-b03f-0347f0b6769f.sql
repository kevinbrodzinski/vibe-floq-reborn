-- Create RPC function to clear demo presence data safely
CREATE OR REPLACE FUNCTION clear_demo_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM vibes_now WHERE profile_id::text LIKE 'demo-user-%';
END; $$;