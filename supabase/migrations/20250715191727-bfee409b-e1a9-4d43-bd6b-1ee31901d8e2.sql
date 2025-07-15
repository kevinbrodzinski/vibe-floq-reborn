-- Replace the function without the SET LOCAL statement
CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  me uuid,
  max_dist_m integer DEFAULT 1000,
  limit_n integer DEFAULT 5
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
STABLE                 -- keep STABLE so the planner can inline it
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.friend,
    p.display_name,
    p.avatar_url,
    fp.vibe_tag,
    COALESCE(vibe_similarity(uvs.vibe_tag, fp.vibe_tag), 0.0)  AS vibe_match,
    ST_DistanceSphere(fp.location, uvs.location)              AS distance_m,
    fp.started_at
  FROM public.friend_presence fp
  JOIN public.profiles p     ON p.id = fp.friend
  LEFT JOIN LATERAL (
    SELECT v.location, v.vibe_tag
    FROM public.user_vibe_states v
    WHERE v.user_id = me AND v.active
    LIMIT 1
  ) uvs ON TRUE
  WHERE uvs.location IS NOT NULL         -- caller must have an active vibe row
    AND fp.me = me                       -- only my friends
    AND ST_DistanceSphere(fp.location, uvs.location) <= max_dist_m
  ORDER BY
    vibe_match DESC,
    distance_m ASC,
    fp.started_at DESC
  LIMIT limit_n;
END;
$$;