
-- Enhanced Avatar Storage Migration with Production-Ready Features
-- Based on user feedback and security best practices

-- Create avatar variants table for caching different sizes
CREATE TABLE IF NOT EXISTS public.avatar_variants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tiny_url text,    -- 64px webp
  small_url text,   -- 128px webp  
  full_url text,    -- original
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on avatar variants
ALTER TABLE public.avatar_variants ENABLE ROW LEVEL SECURITY;

-- RLS policy for avatar variants (users can only see their own)
CREATE POLICY "Users can manage their own avatar variants"
ON public.avatar_variants
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create avatars storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Comprehensive RLS policies for storage.objects (avatars bucket)
-- 1. Users can upload their own avatars
CREATE POLICY "Avatar owners can upload"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = owner
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Users can delete their own avatars  
CREATE POLICY "Avatar owners can delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = owner
);

-- 3. Users can update/replace their own avatars (missing from original patch)
CREATE POLICY "Avatar owners can update"
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
CREATE POLICY "Avatars are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Automatic variant sync trigger function
CREATE OR REPLACE FUNCTION public.sync_avatar_variants()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.avatar_variants 
    WHERE user_id = OLD.owner::uuid;
    RETURN OLD;
  END IF;

  -- Handle INSERT/UPDATE operations
  -- Build the public URLs for different variants
  INSERT INTO public.avatar_variants (user_id, tiny_url, small_url, full_url, updated_at)
  VALUES (
    NEW.owner::uuid,
    'avatars/' || (storage.foldername(NEW.name))[1] || '/tiny.webp',
    'avatars/' || (storage.foldername(NEW.name))[1] || '/small.webp', 
    'avatars/' || NEW.name,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    tiny_url = EXCLUDED.tiny_url,
    small_url = EXCLUDED.small_url,
    full_url = EXCLUDED.full_url,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Create trigger for automatic variant syncing
DROP TRIGGER IF EXISTS trg_sync_avatar_variants ON storage.objects;
CREATE TRIGGER trg_sync_avatar_variants
  AFTER INSERT OR UPDATE OR DELETE ON storage.objects
  FOR EACH ROW 
  WHEN (
    (TG_OP = 'DELETE' AND OLD.bucket_id = 'avatars') OR
    (TG_OP IN ('INSERT', 'UPDATE') AND NEW.bucket_id = 'avatars')
  )
  EXECUTE FUNCTION public.sync_avatar_variants();

-- Update profiles table to ensure avatar_url column exists and is properly indexed
DO $$ 
BEGIN
  -- Add avatar_url column if it doesn't exist (it should already exist based on schema)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Index for fast avatar lookups (avatar_variants.user_id is already PK, so indexed)
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Grant necessary permissions
GRANT ALL ON public.avatar_variants TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_avatar_variants TO authenticated;
