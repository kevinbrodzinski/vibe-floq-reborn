-- Enhanced Authentication & Security Migration
-- Based on detailed audit feedback - fixes blocking issues and improves safety

-- 1. Tighten PostGIS system table permissions (safer than RLS)
REVOKE INSERT, UPDATE, DELETE ON public.spatial_ref_sys FROM PUBLIC;

-- 2. Create/update handle_new_user function with proper security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- 3. Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Update all public functions to use secure search_path
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname NOT IN ('handle_new_user') -- Skip if already handled
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public;',
        f.schema_name, f.func_name, f.args
      );
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not update function %.%: %', f.schema_name, f.func_name, SQLERRM;
    END;
  END LOOP;
END$$;

-- 5. Setup avatar storage bucket with proper policies
DO $$
BEGIN
  -- Create avatars bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Drop existing policies safely
  DROP POLICY IF EXISTS "Avatar images public read" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar upload own folder" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar update own files" ON storage.objects;
  DROP POLICY IF EXISTS "Avatar delete own files" ON storage.objects;
  
  -- Create new avatar policies
  CREATE POLICY "Avatar images public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
    
  CREATE POLICY "Avatar upload own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
    
  CREATE POLICY "Avatar update own files"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'avatars' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
    
  CREATE POLICY "Avatar delete own files"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'avatars' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
END$$;

-- 6. Enable RLS on all user-facing tables (skip system tables and views)
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns')
      AND tableowner != 'postgres'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', t.schemaname, t.tablename);
      RAISE NOTICE 'Enabled RLS on %.%', t.schemaname, t.tablename;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Skipping % due to: %', t.tablename, SQLERRM;
    END;
  END LOOP;
END$$;

-- 7. Grant appropriate permissions (limited scope for anon)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Grant execute only on specific functions for anon
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- 8. Create updated_at trigger function with proper security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;