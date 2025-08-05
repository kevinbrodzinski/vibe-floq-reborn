-- Clean up the helper function that's not needed on older Auth stacks
DROP FUNCTION IF EXISTS public._upsert_auth_cfg(text, text);