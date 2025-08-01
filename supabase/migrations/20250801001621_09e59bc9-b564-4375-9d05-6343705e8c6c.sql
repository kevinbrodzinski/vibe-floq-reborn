-- Drop and recreate search_profiles function with optimized version
DROP FUNCTION IF EXISTS public.search_profiles;

CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query  text,
  p_limit  int DEFAULT 20
)
RETURNS TABLE (
  id           uuid,
  display_name text,
  username     text,
  avatar_url   text,
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER          -- ← keep; we still rely on RLS for privacy
SET search_path = public  -- safety: never search another schema
AS $func$
  /*---------------------------------------------
    NOTES
    • 'simple' dictionary ≈ case-folding, no stemming.
    • prefix ILIKE *does* use the pg_trgm GIN index.
  ----------------------------------------------*/
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.created_at
  FROM public.profiles  AS p
  WHERE
        p.is_searchable
    AND p.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)

    /* ---------- MAIN MATCH BLOCK ---------- */
    AND (
         /* Full-text vector match */
         p.search_vec @@ plainto_tsquery('simple', p_query)

      OR /* Username prefix – uses trigram index */
         p.username ILIKE p_query || '%'

      OR /* Fuzzy (typo-tolerant) trigram similarity */
         p.username % p_query
    )

  /* ---------- ORDER ---------- */
  ORDER BY
        /* exact username prefix first */
        (p.username ILIKE p_query || '%') DESC,

        /* FTS rank next */
        ts_rank(p.search_vec, plainto_tsquery('simple', p_query)) DESC,

        /* then recency */
        p.updated_at DESC

  LIMIT p_limit;
$func$;

GRANT EXECUTE ON FUNCTION public.search_profiles(text, int) TO authenticated, anon;