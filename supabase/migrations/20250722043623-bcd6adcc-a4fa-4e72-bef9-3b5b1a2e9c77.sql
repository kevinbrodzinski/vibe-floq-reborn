-- Add performance index for field tiles aggregation
CREATE INDEX IF NOT EXISTS user_vibe_states_gh5_idx
  ON public.user_vibe_states (gh5)
  WHERE active = true;

-- Make hue normalization bullet-proof against NaN
CREATE OR REPLACE FUNCTION public.refresh_field_tiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.field_tiles
    (tile_id, crowd_count, avg_vibe, active_floq_ids, updated_at)
  SELECT
    uvs.gh5,
    COUNT(*),
    -- Circular-mean hue + linear S/L with NaN protection
    jsonb_build_object(
      'h', COALESCE(
        ATAN2(AVG(SIN(RADIANS(uvs.vibe_h * 360))), 
              AVG(COS(RADIANS(uvs.vibe_h * 360)))) * 180 / PI() / 360,
        0
      ),
      's', AVG(uvs.vibe_s),
      'l', AVG(uvs.vibe_l)
    ),
    -- Get active floq IDs by joining with floq_participants
    ARRAY_AGG(DISTINCT fp.floq_id ORDER BY fp.floq_id) 
      FILTER (WHERE fp.floq_id IS NOT NULL),
    now()
  FROM public.user_vibe_states uvs
  LEFT JOIN public.floq_participants fp ON fp.user_id = uvs.user_id
  LEFT JOIN public.floqs f ON f.id = fp.floq_id 
    AND f.ends_at > now() 
    AND f.deleted_at IS NULL
  WHERE uvs.gh5 IS NOT NULL
    AND uvs.active = true
    AND uvs.started_at > now() - interval '15 minutes'
  GROUP BY uvs.gh5
  ON CONFLICT (tile_id) DO UPDATE
    SET crowd_count     = EXCLUDED.crowd_count,
        avg_vibe        = EXCLUDED.avg_vibe,
        active_floq_ids = EXCLUDED.active_floq_ids,
        updated_at      = now();
END;
$$;