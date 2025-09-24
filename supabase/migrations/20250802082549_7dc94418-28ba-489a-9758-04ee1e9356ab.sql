-- Function to get current field state (for now, will add history later)
CREATE OR REPLACE FUNCTION public.get_field_state_at(p_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
RETURNS NULL ON NULL INPUT
SET search_path TO 'public'
AS $$
BEGIN
  -- For now, return current state regardless of timestamp
  -- TODO: Add historical data when field_tiles_history/vibes_now_history tables exist
  
  RETURN jsonb_build_object(
    'timestamp', p_ts,
    'field_tiles', (
      SELECT jsonb_agg(to_jsonb(ft))
      FROM field_tiles ft
    ),
    'presence', (
      SELECT jsonb_agg(obj.data)
      FROM (
        SELECT jsonb_build_object(
          'profile_id', vn.profile_id,
          'lat', ST_Y(vn.location),
          'lng', ST_X(vn.location),
          'vibe', vn.vibe
        ) as data
        FROM vibes_now vn
        WHERE vn.visibility = 'public'
        LIMIT 200  -- Prevent JSON explosion in busy areas
      ) obj
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_field_state_at(timestamptz) TO authenticated, anon;