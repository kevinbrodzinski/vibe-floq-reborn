-- Enhanced Avatar Storage Migration v2 (Simplified to avoid type issues)
-- Create the avatar system without complex triggers for now

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
USING (true);

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (simplified naming)
CREATE POLICY "avatars_upload_policy"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = owner
);

CREATE POLICY "avatars_delete_policy"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = owner
);

CREATE POLICY "avatars_update_policy" 
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

CREATE POLICY "avatars_read_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Index for avatar lookups
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Permissions
GRANT SELECT, INSERT, UPDATE ON public.avatar_variants TO authenticated;