-- Drop existing function and recreate with new signature
DROP FUNCTION IF EXISTS public.search_profiles(text,integer);

-- Replace the old search_profiles with an index-friendly version
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query  text,
  p_limit  int DEFAULT 20
)
RETURNS TABLE(
  id           uuid,
  username     text,
  display_name text,
  avatar_url   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER          -- callers don't need direct table rights
SET search_path = public  -- safe schema path
AS $$
  /* Prepare tsquery once so it isn't rebuilt per row */
  WITH q AS (
    SELECT plainto_tsquery('simple', p_query) AS tsq,
           lower(p_query)                     AS raw
  )
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url
  FROM   public.profiles p, q
  WHERE  p.id <> auth.uid()                 -- no self
    AND  p.is_searchable                    -- respect privacy toggle

    /* ---------- MATCHING CRITERIA (uses indexes) ---------- */
    AND (
         /* 1️⃣  Full-text vector match */
         p.search_vec @@ q.tsq

         /* 2️⃣  OR trigram prefix match ("foo%") */
         OR p.username     ILIKE p_query || '%'
         OR p.display_name ILIKE p_query || '%'
       )

  /* ---------- RANKING ---------- */
  ORDER BY
    /* exact username / display-name first */
    (lower(p.username)     = q.raw OR lower(p.display_name) = q.raw) DESC,
    /* then prefix match */
    (p.username     ILIKE p_query || '%'
     OR p.display_name ILIKE p_query || '%') DESC,
    /* then FTS rank (uses search_vec index) */
    ts_rank(p.search_vec, q.tsq) DESC,
    /* tie-breaker */
    p.username
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles(text,int) TO authenticated, anon;