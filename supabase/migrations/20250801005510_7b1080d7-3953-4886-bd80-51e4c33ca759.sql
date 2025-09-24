-- Add missing columns for search_profiles function
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_searchable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS search_vec tsvector;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_profiles_search_vec 
ON public.profiles USING gin(search_vec);

-- Create trigger to update search vector automatically
CREATE OR REPLACE FUNCTION update_profiles_search_vec()
RETURNS trigger AS $$
BEGIN
  NEW.search_vec := to_tsvector('simple', 
    COALESCE(NEW.username, '') || ' ' || 
    COALESCE(NEW.display_name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_update_profiles_search_vec ON public.profiles;
CREATE TRIGGER tg_update_profiles_search_vec
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_search_vec();

-- Update existing profiles to populate search_vec
UPDATE public.profiles 
SET search_vec = to_tsvector('simple', 
  COALESCE(username, '') || ' ' || 
  COALESCE(display_name, '')
)
WHERE search_vec IS NULL;