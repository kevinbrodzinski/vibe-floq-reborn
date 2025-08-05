/* ------------------------------------------------------------------ *
 * Fix get_social_suggestions function - Final Implementation         *
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * 1)  Clean-up – drop any previous broken overloads                  *
 * ------------------------------------------------------------------ */
DROP FUNCTION IF EXISTS public.get_social_suggestions(
  uuid, numeric, numeric, numeric, integer, text, text, integer
);
DROP FUNCTION IF EXISTS public.get_social_suggestions(
  uuid, integer, integer
);   -- earlier 3-arg version
DROP FUNCTION IF EXISTS public.get_social_suggestions(
  integer, integer, uuid
);   -- legacy wrong order

/* ------------------------------------------------------------------ *
 * 2)  Create the correct function                                    *
 * ------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.get_social_suggestions (
  p_profile_id  uuid,          -- caller's profile_id  (required – edge fn passes it)
  p_lat         numeric,       -- caller's latitude
  p_lng         numeric,       -- caller's longitude
  p_radius_km   numeric  DEFAULT 1,   -- search radius
  p_limit       integer  DEFAULT 10,  -- # rows to return
  p_vibe        text     DEFAULT NULL,
  p_activity    text     DEFAULT NULL,  -- kept for future use
  p_group_size  integer  DEFAULT NULL   -- kept for future use
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public          -- so we can call it from any schema
AS $$
DECLARE
  v_radius_m  numeric := p_radius_km * 1000;   -- metres for ST_DWithin
BEGIN
  /* -------------------------------------------------------------- *
   * CANDIDATE VENUES WITH DISTANCE & SIMPLE SCORE                  *
   * -------------------------------------------------------------- */
  RETURN (
    WITH candidates AS (
      SELECT
        v.id,
        v.name,
        v.vibe,                                 -- TEXT column
        v.popularity,                           -- integer 0-∞
        v.rating,                               -- numeric 0-5
        ST_Distance(                            -- geography distance (metres)
          v.location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )                    AS distance_m
      FROM   public.venues v
      WHERE  v.location IS NOT NULL
        AND  v.is_active
        AND  ST_DWithin(
               v.location,
               ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
               v_radius_m
             )
        AND  (p_vibe IS NULL OR v.vibe = p_vibe)
        /* ----------------------------------------------------- *
         * future filters – leave placeholders so edge-fn call   *
         * does not break when NULL is passed                    *
         * ----------------------------------------------------- */
        AND  (p_activity   IS NULL OR TRUE)      -- no activity col yet
        AND  (p_group_size IS NULL OR TRUE)      -- no group size col yet
    ),
    ranked AS (                                   -- naïve scoring
      SELECT *,
             ( 0.4 * (1 - distance_m / v_radius_m)           -- nearer = better
             + 0.4 * COALESCE(rating,0)   / 5                -- rating 0-5
             + 0.2 * COALESCE(popularity,0) / 100 )          -- popularity heuristic
             AS score
      FROM   candidates
      ORDER  BY score DESC
      LIMIT  p_limit
    )
    /* ---------------------------------------------------------- *
     * BUILD THE JSON RESPONSE                                    *
     * ---------------------------------------------------------- */
    SELECT jsonb_build_object(
      'suggestions',
      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'id',          id,
             'title',       name,
             'vibe',        vibe,
             'distance_m',  distance_m,
             'rating',      rating,
             'score',       round(score,3)
           )
         )
         FROM ranked),
        '[]'::jsonb
      )
    )
  );
END;
$$;

/* ------------------------------------------------------------------ *
 * 3)  Permissions                                                     *
 * ------------------------------------------------------------------ */
GRANT EXECUTE ON FUNCTION public.get_social_suggestions(
  uuid, numeric, numeric, numeric, integer, text, text, integer
) TO anon, authenticated;