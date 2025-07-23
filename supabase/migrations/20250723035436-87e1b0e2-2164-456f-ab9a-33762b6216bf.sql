-- Update refresh_field_tiles function to use vibes_now table instead of user_vibe_states
CREATE OR REPLACE FUNCTION public.refresh_field_tiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.field_tiles
    (tile_id, crowd_count, avg_vibe, active_floq_ids, updated_at)
  SELECT
    vn.geohash6,
    COUNT(*),
    -- Extract vibe color from vibes_now vibe enum and convert to HSL format
    jsonb_build_object(
      'h', CASE vn.vibe
        WHEN 'chill' THEN 0.55
        WHEN 'hype' THEN 0.08
        WHEN 'social' THEN 0.75
        WHEN 'curious' THEN 0.25
        WHEN 'flowing' THEN 0.45
        ELSE 0.5
      END,
      's', 0.7,
      'l', 0.6
    ),
    -- Get active floq IDs by joining with floq_participants
    ARRAY_AGG(DISTINCT fp.floq_id ORDER BY fp.floq_id) 
      FILTER (WHERE fp.floq_id IS NOT NULL),
    now()
  FROM public.vibes_now vn
  LEFT JOIN public.floq_participants fp ON fp.user_id = vn.user_id
  LEFT JOIN public.floqs f ON f.id = fp.floq_id 
    AND f.ends_at > now() 
    AND f.deleted_at IS NULL
  WHERE vn.geohash6 IS NOT NULL
    AND vn.updated_at > now() - interval '15 minutes'
  GROUP BY vn.geohash6
  ON CONFLICT (tile_id) DO UPDATE
    SET crowd_count     = EXCLUDED.crowd_count,
        avg_vibe        = EXCLUDED.avg_vibe,
        active_floq_ids = EXCLUDED.active_floq_ids,
        updated_at      = now();
END;
$$;