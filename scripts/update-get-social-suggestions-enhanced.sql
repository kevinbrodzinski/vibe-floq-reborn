/* ------------------------------------------------------------------ *
 * Updated get_social_suggestions function - Enhanced Implementation   *
 * ------------------------------------------------------------------ */

CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  /* required args first (no defaults) */
  p_lat        numeric,                       -- caller's latitude  (°)
  p_lng        numeric,                       -- caller's longitude (°)

  /* optional args (all have defaults) */
  p_radius_km  numeric  DEFAULT 1,            -- search radius in km
  p_limit      integer  DEFAULT 10,           -- max suggestions
  p_vibe       text     DEFAULT NULL,         -- vibe filter
  p_activity   text     DEFAULT NULL,         -- activity filter
  p_group_size integer  DEFAULT NULL,         -- reserved
  p_profile_id uuid     DEFAULT auth.uid()    -- keep last with default!
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_radius_m numeric := p_radius_km * 1000;   -- km → m
BEGIN
  ------------------------------------------------------------------
  -- ① candidates: venues inside radius   (+ optional filters)
  ------------------------------------------------------------------
  RETURN (
    WITH candidates AS (
      SELECT
        v.id,
        v.name,
        v.vibe,
        v.categories,
        v.rating,
        v.popularity,
        v.live_count,
        COALESCE(
          v.location,
          ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
        )                                AS venue_loc,
        ST_Distance(
          COALESCE(
            v.location,
            ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
          ),
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )                                AS distance_m
      FROM public.venues v
      WHERE v.location IS NOT NULL
        AND ST_DWithin(
              COALESCE(
                v.location,
                ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography
              ),
              ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
              v_radius_m
            )
        AND (p_vibe     IS NULL OR v.vibe            = p_vibe)
        AND (p_activity IS NULL
             OR (v.categories IS NOT NULL AND v.categories[1] = p_activity))
    ),

    ------------------------------------------------------------------
    -- ② simple weighted score
    ------------------------------------------------------------------
    ranked AS (
      SELECT *,
             ( 0.4 * (1 - distance_m / v_radius_m)
             + 0.4 * COALESCE(rating,0)     / 5
             + 0.2 * COALESCE(popularity,0) / 100
             ) AS score
      FROM   candidates
      ORDER  BY score DESC
      LIMIT  p_limit
    )

    ------------------------------------------------------------------
    -- ③ JSON payload for the Edge Function
    ------------------------------------------------------------------
    SELECT jsonb_build_object(
             'suggestions',
             COALESCE(
               (
                 SELECT jsonb_agg(
                          jsonb_build_object(
                            'id'         , id,
                            'title'      , name,
                            'vibe'       , vibe,
                            'activity'   , COALESCE(categories[1], NULL),
                            'distance_m' , distance_m,
                            'rating'     , rating,
                            'popularity' , popularity,
                            'live_count' , live_count,
                            'score'      , ROUND(score::numeric, 3)
                          )
                        )
                 FROM ranked
               ),
               '[]'::jsonb
             )
           )
  );
END;
$$;

-- permissions
GRANT EXECUTE ON FUNCTION public.get_social_suggestions(
  numeric, numeric, numeric, integer, text, text, integer, uuid
) TO anon, authenticated;