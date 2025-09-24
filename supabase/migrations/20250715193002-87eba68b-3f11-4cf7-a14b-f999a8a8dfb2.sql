CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  p_uid        uuid,
  max_dist_m   integer DEFAULT 1000,
  limit_n      integer DEFAULT 5
)
RETURNS TABLE (
  friend_id    uuid,
  display_name text,
  avatar_url   text,
  vibe_tag     vibe_enum,
  vibe_match   real,
  distance_m   real,
  started_at   timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  RETURN QUERY
  SELECT
    fp.friend,
    pr.display_name,
    pr.avatar_url,
    fp.vibe_tag,
    COALESCE(vibe_similarity(uvs.vibe_tag, fp.vibe_tag), 0)  AS vibe_match,
    ----------------------------------------------------------------
    -- ✱ use geometry cast so ST_DistanceSphere matches the signature
    ST_DistanceSphere(fp.location::geometry, uvs.location::geometry) AS distance_m,
    -- If you prefer geography, comment the line above and uncomment:
    -- ST_Distance(fp.location, uvs.location) AS distance_m,
    ----------------------------------------------------------------
    fp.started_at
  FROM public.friend_presence   AS fp
  JOIN public.profiles          AS pr  ON pr.id = fp.friend
  LEFT JOIN LATERAL (
      SELECT v.location, v.vibe_tag
      FROM   public.user_vibe_states v
      WHERE  v.user_id = p_uid
        AND  v.active
      LIMIT 1
  ) AS uvs ON TRUE
  WHERE fp.me = p_uid
    AND uvs.location IS NOT NULL
    AND ----------------------------------------------------------------
        -- same cast (or ST_Distance) inside the radius filter
        ST_DistanceSphere(fp.location::geometry, uvs.location::geometry) <= max_dist_m
        -- ST_Distance(fp.location, uvs.location) <= max_dist_m
    ----------------------------------------------------------------
  ORDER BY
    vibe_match DESC,
    distance_m ASC,
    fp.started_at DESC
  LIMIT limit_n;
END;
$func$;

-- don't forget to re-grant if needed
GRANT EXECUTE ON FUNCTION public.get_social_suggestions(uuid,integer,integer) TO authenticated;