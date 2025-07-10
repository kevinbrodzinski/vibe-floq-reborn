-- Enhanced username system with reserved words and improved validation

-- 1. Create reserved usernames table with RLS
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  name TEXT PRIMARY KEY
);

-- Enable RLS on reserved usernames table
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for reserved usernames
CREATE POLICY "Reserved usernames are readable by all" 
ON public.reserved_usernames 
FOR SELECT 
USING (true);

-- 2. Insert reserved words (idempotent - won't error on duplicates)
INSERT INTO public.reserved_usernames (name) VALUES
  ('admin'), ('root'), ('support'), ('api'), ('u'), ('about'), ('privacy'),
  ('help'), ('contact'), ('terms'), ('legal'), ('www'), ('mail'), ('ftp'),
  ('blog'), ('news'), ('app'), ('mobile'), ('web'), ('dev'), ('test'),
  ('stage'), ('staging'), ('prod'), ('production'), ('beta'), ('alpha'),
  ('demo'), ('example'), ('sample'), ('null'), ('undefined'), ('true'), ('false')
ON CONFLICT (name) DO NOTHING;

-- 3. Add username column to profiles with proper constraints
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create case-insensitive unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_username_ci 
ON public.profiles (lower(username)) 
WHERE username IS NOT NULL;

-- 4. Update username_available function to check reserved words and use case-insensitive check
CREATE OR REPLACE FUNCTION public.username_available(u TEXT)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
AS $$
  SELECT NOT EXISTS (
    -- Check if username exists (case-insensitive)
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(u)
  ) AND NOT EXISTS (
    -- Check if username is reserved
    SELECT 1 FROM public.reserved_usernames WHERE name = lower(u)
  );
$$;

-- 5. Create attempt_claim_username function with enhanced validation
CREATE OR REPLACE FUNCTION public.attempt_claim_username(desired TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE
  cleaned_username TEXT;
BEGIN
  -- Basic validation
  IF desired IS NULL OR desired = '' THEN
    RAISE EXCEPTION 'Username cannot be empty';
  END IF;
  
  -- Clean and validate format
  cleaned_username := trim(lower(desired));
  
  -- Check length (3-20 characters)
  IF length(cleaned_username) < 3 OR length(cleaned_username) > 20 THEN
    RAISE EXCEPTION 'Username must be between 3 and 20 characters';
  END IF;
  
  -- Check format (alphanumeric and underscores only, no leading/trailing underscores)
  IF NOT cleaned_username ~ '^[a-z0-9]([a-z0-9_]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Username can only contain letters, numbers, and underscores. Cannot start or end with underscore.';
  END IF;
  
  -- Check if username is reserved
  IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE name = cleaned_username) THEN
    RAISE EXCEPTION 'Username "%" is reserved', desired;
  END IF;
  
  -- Check if username is already taken (case-insensitive)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = cleaned_username) THEN
    RAISE EXCEPTION 'Username "%" is already taken', desired;
  END IF;
  
  -- Update the user's profile with the cleaned username
  UPDATE public.profiles 
  SET username = cleaned_username 
  WHERE id = auth.uid();
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update username. User profile not found.';
  END IF;
  
  RETURN true;
END;
$$;

-- 6. Create get_user_by_username function for vanity routes
CREATE OR REPLACE FUNCTION public.get_user_by_username(lookup_username TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE lower(p.username) = lower(lookup_username)
  AND p.username IS NOT NULL;
$$;