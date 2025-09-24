-- ╭─────────────────────────────────────────────────────────╮
-- │ 0. Extensions                                          │
-- ╰─────────────────────────────────────────────────────────╯
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ╭─────────────────────────────────────────────────────────╮
-- │ 1. Indexes  (run OUTSIDE any explicit BEGIN/COMMIT)     │
-- ╰─────────────────────────────────────────────────────────╯
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING gin ( lower(username::text) gin_trgm_ops );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_fullname_trgm
  ON public.profiles USING gin ( lower(coalesce(full_name, '')) gin_trgm_ops );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_displayname_trgm
  ON public.profiles USING gin ( lower(coalesce(display_name, '')) gin_trgm_ops );

-- ╭─────────────────────────────────────────────────────────╮
-- │ 2. Search function                                     │
-- ╰─────────────────────────────────────────────────────────╯
CREATE OR REPLACE FUNCTION public.search_users(
  p_query text,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  full_name text,
  avatar_url text,
  created_at timestamptz,
  search_rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q        text := lower(trim(p_query));
  v_limit  int  := greatest(1, least(p_limit, 50));
BEGIN
  IF q IS NULL OR length(q) < 2 THEN  -- reject 1-char searches
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.full_name,
    p.avatar_url,
    p.created_at,
    CASE
      WHEN lower(p.username)                      = q               THEN 1.00
      WHEN lower(p.username)          LIKE q || '%'                 THEN 0.90
      WHEN lower(p.username)          LIKE '%'||q||'%'              THEN 0.80
      WHEN lower(coalesce(p.full_name,''))    LIKE q || '%'         THEN 0.70
      WHEN lower(coalesce(p.display_name,'')) LIKE q || '%'         THEN 0.60
      WHEN lower(coalesce(p.full_name,''))    LIKE '%'||q||'%'      THEN 0.50
      WHEN lower(coalesce(p.display_name,'')) LIKE '%'||q||'%'      THEN 0.40
      ELSE 0
    END AS search_rank
  FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND (
          lower(p.username)                LIKE '%'||q||'%' OR
          lower(coalesce(p.full_name,''))  LIKE '%'||q||'%' OR
          lower(coalesce(p.display_name,'')) LIKE '%'||q||'%'
        )
  ORDER BY search_rank DESC, p.username
  LIMIT v_limit;
END;
$$;

ALTER FUNCTION public.search_users(text,int) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.search_users(text,int) TO authenticated;