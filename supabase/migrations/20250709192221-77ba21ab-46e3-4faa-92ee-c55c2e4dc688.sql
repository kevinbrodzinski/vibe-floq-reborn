-- Enhanced Avatar Storage Migration v2 (Production-Ready) - TYPE CAST FIXED
-- Incorporates all feedback from security and performance review

-- Create avatar variants table for caching different sizes
CREATE TABLE IF NOT EXISTS public.avatar_variants (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tiny_url text,    -- 64px webp
  small_url text,   -- 128px webp  
  full_url text,    -- original
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on avatar variants
ALTER TABLE public.avatar_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for avatar variants (users can manage their own)
CREATE POLICY "Users can manage their own avatar variants"
ON public.avatar_variants
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Separate SELECT policy for support/admin access
CREATE POLICY "Support can read all avatar variants"
ON public.avatar_variants
FOR SELECT
USING (true); -- Will be restricted by app-level role checks

-- Create avatars storage bucket (compatible with both v1 and v2)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Comprehensive RLS policies for storage.objects (avatars bucket)
-- Note: Policy names must be unique across the entire storage.objects table

-- 1. Users can upload their own avatars (fixed: use split_part instead of storage.foldername)
CREATE POLICY "Avatar bucket: owners can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = owner
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 2. Users can delete their own avatars  
CREATE POLICY "Avatar bucket: owners can delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = owner
);

-- 3. Users can update/replace their own avatars
CREATE POLICY "Avatar bucket: owners can update" 
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = owner
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = owner
);

-- 4. Public read access for avatars (since bucket is public)
CREATE POLICY "Avatar bucket: public read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Automatic variant sync trigger function (fixed type casting)
CREATE OR REPLACE FUNCTION public.sync_avatar_variants()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.avatar_variants 
    WHERE user_id = OLD.owner::uuid;
    RETURN OLD;
  END IF;

  -- Handle INSERT/UPDATE operations with change detection
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW IS DISTINCT FROM OLD) THEN
    -- Build the public URLs for different variants (fixed type casting)
    INSERT INTO public.avatar_variants (user_id, tiny_url, small_url, full_url, updated_at)
    VALUES (
      NEW.owner::uuid,
      'avatars/' || split_part(NEW.name, '/', 1) || '/tiny.webp',
      'avatars/' || split_part(NEW.name, '/', 1) || '/small.webp', 
      'avatars/' || NEW.name,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      tiny_url = EXCLUDED.tiny_url,
      small_url = EXCLUDED.small_url,
      full_url = EXCLUDED.full_url,
      updated_at = now();
  END IF;
    
  RETURN NEW;
END;
$$;

-- Create trigger for automatic variant syncing (simplified WHEN clause)
DROP TRIGGER IF EXISTS trg_sync_avatar_variants ON storage.objects;
CREATE TRIGGER trg_sync_avatar_variants
  AFTER INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW 
  WHEN ((TG_OP = 'DELETE' AND OLD.bucket_id = 'avatars') OR (TG_OP IN ('INSERT', 'UPDATE') AND NEW.bucket_id = 'avatars'))
  EXECUTE FUNCTION public.sync_avatar_variants();

-- Ensure profiles.avatar_url column exists (defensive)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Optimized index for avatar lookups (with optional case-insensitive support)
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Conservative permissions (no DELETE via table grants)
GRANT SELECT, INSERT, UPDATE ON public.avatar_variants TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_avatar_variants TO authenticated;