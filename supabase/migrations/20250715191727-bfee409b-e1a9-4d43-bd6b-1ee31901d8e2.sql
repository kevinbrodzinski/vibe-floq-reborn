-- 🔄  replace the old version
CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  p_uid        uuid,            -- <-- renamed
  max_dist_m   integer DEFAULT 1000,
  limit_n      integer DEFAULT 5
)
RETURNS TABLE (
  friend_id   uuid,
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
AS $$
BEGIN
  -- (optional) you can keep or remove this line; it's not essential
  -- SET LOCAL enable_seqscan = off;

  RETURN QUERY
  SELECT
    fp.friend,
    p.display_name,
    p.avatar_url,
    fp.vibe_tag,
    COALESCE(vibe_similarity(uvs.vibe_tag, fp.vibe_tag), 0.0)        AS vibe_match,
    ST_DistanceSphere(fp.location, uvs.location)                     AS distance_m,
    fp.started_at
  FROM public.friend_presence AS fp
  JOIN public.profiles AS p
    ON p.id = fp.friend

  -- grab *my* current vibe & location once
  LEFT JOIN LATERAL (
    SELECT v.location, v.vibe_tag
    FROM   public.user_vibe_states AS v
    WHERE  v.user_id = p_uid
      AND  v.active
    LIMIT 1
  ) AS uvs ON TRUE

  WHERE uvs.location IS NOT NULL                   -- caller must have an active vibe
    AND fp.me = p_uid                              -- only my friends
    AND ST_DistanceSphere(fp.location, uvs.location) <= max_dist_m
  ORDER BY
    vibe_match DESC,
    distance_m ASC,
    fp.started_at DESC
  LIMIT limit_n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_social_suggestions(uuid, integer, integer) TO authenticated;