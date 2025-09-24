-- Add missing is_searchable column only (search_vec already exists as generated column)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_searchable boolean DEFAULT true;

-- Create index for full-text search if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_search_vec 
ON public.profiles USING gin(search_vec);

-- Add trigram indexes for ILIKE searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm 
ON public.profiles USING gin(username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm 
ON public.profiles USING gin(display_name gin_trgm_ops);