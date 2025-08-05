-- Performance indexes for historical queries
CREATE INDEX IF NOT EXISTS field_tiles_hist_bucket_idx
  ON field_tiles_history (bucket_ts);

CREATE INDEX IF NOT EXISTS vibes_now_hist_bucket_idx  
  ON vibes_now_history (bucket_ts);

-- Function to get historical field state at a specific timestamp
CREATE OR REPLACE FUNCTION public.get_field_state_at(p_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
RETURNS NULL ON NULL INPUT
SET search_path TO 'public'
AS $$
DECLARE
  rounded_ts timestamptz;
BEGIN
  -- Round to nearest 15-minute bucket
  rounded_ts := date_trunc('minute', p_ts) - 
                (extract(minute from p_ts)::int % 15) * interval '1 minute';
  
  RETURN jsonb_build_object(
    'timestamp', rounded_ts,
    'field_tiles', (
      SELECT jsonb_agg(to_jsonb(ft))
      FROM field_tiles_history ft
      WHERE ft.bucket_ts = rounded_ts
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
        FROM vibes_now_history vn
        WHERE vn.bucket_ts = rounded_ts
        LIMIT 200  -- Prevent JSON explosion in busy areas
      ) obj
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_field_state_at(timestamptz) TO authenticated, anon;