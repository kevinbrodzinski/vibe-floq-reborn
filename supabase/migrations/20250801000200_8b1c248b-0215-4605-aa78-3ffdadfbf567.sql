-- Phase 1: Friend Discovery Database Setup
BEGIN;

-- 1.1 Add searchability to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_searchable boolean NOT NULL DEFAULT true;

-- 1.2 Add search vector for full-text search
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS search_vec tsvector
GENERATED ALWAYS AS (
  to_tsvector(
    'simple',
    coalesce(username,'') || ' ' || coalesce(display_name,'')
  )
) STORED;

-- 1.3 Create search indexes
CREATE INDEX IF NOT EXISTS idx_profiles_search_vec
ON public.profiles USING GIN (search_vec);

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index for fuzzy username matching
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm
ON public.profiles USING gin (username gin_trgm_ops);

-- 1.4 Update RLS policies for searchable profiles
DROP POLICY IF EXISTS "read_searchable" ON public.profiles;

CREATE POLICY "read_searchable"
ON public.profiles
FOR SELECT
USING (is_searchable = true OR id = auth.uid());

-- 1.5 Create search_profiles RPC function
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.profiles
  WHERE
    is_searchable = true
    AND id != auth.uid()  -- Don't include self in results
    AND (
         -- Full-text search
         search_vec @@ plainto_tsquery('simple', p_query)
         
         -- OR fuzzy username match
         OR username ILIKE p_query || '%'
         OR username % p_query  -- trigram similarity
         
         -- OR display name prefix match
         OR display_name ILIKE p_query || '%'
    )
  ORDER BY
    -- Ranking: prefix username hits first, then FTS rank, then recent
    (username ILIKE p_query || '%') DESC,
    ts_rank(search_vec, plainto_tsquery('simple', p_query)) DESC,
    created_at DESC
  LIMIT p_limit;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_profiles(text,int) TO authenticated, anon;

COMMIT;