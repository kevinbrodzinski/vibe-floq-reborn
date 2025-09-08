-- Enhanced get_field_tiles function with velocity computation and temporal history tracking
CREATE OR REPLACE FUNCTION get_field_tiles_enhanced(
  p_tile_ids text[],
  p_include_history boolean DEFAULT true,
  p_time_window interval DEFAULT '5 minutes'::interval
) RETURNS TABLE (
  tile_id text,
  crowd_count integer,
  avg_vibe jsonb,
  active_floq_ids text[],
  updated_at timestamptz,
  -- NEW fields
  velocity jsonb,
  movement_mode text,
  history jsonb,
  momentum numeric,
  cohesion_score numeric,
  convergence_vector jsonb,
  afterglow_intensity numeric
) AS $$
DECLARE
  v_current_time timestamptz := now();
BEGIN
  RETURN QUERY
  WITH 
  -- Get current tile data
  current_tiles AS (
    SELECT 
      ft.tile_id,
      ft.crowd_count,
      ft.avg_vibe,
      ft.active_floq_ids,
      ft.updated_at,
      CASE 
        WHEN ft.centroid IS NOT NULL THEN ST_X(ft.centroid::geometry)
        ELSE 0
      END as lng,
      CASE 
        WHEN ft.centroid IS NOT NULL THEN ST_Y(ft.centroid::geometry)
        ELSE 0
      END as lat
    FROM field_tiles ft
    WHERE ft.tile_id = ANY(p_tile_ids)
      AND ft.updated_at > v_current_time - p_time_window
  ),
  
  -- Get historical snapshots for velocity calculation
  tile_history AS (
    SELECT 
      ft.tile_id,
      CASE 
        WHEN p_include_history THEN
          jsonb_agg(
            jsonb_build_object(
              'timestamp', ft.updated_at,
              'crowd_count', ft.crowd_count,
              'centroid', jsonb_build_object(
                'lat', CASE WHEN ft.centroid IS NOT NULL THEN ST_Y(ft.centroid::geometry) ELSE 0 END,
                'lng', CASE WHEN ft.centroid IS NOT NULL THEN ST_X(ft.centroid::geometry) ELSE 0 END
              ),
              'vibe', ft.avg_vibe
            ) ORDER BY ft.updated_at DESC
          ) FILTER (WHERE ft.updated_at > v_current_time - p_time_window)
        ELSE NULL
      END as history
    FROM field_tiles ft
    WHERE ft.tile_id = ANY(p_tile_ids)
      AND (NOT p_include_history OR ft.updated_at > v_current_time - p_time_window)
    GROUP BY ft.tile_id
  ),
  
  -- Calculate velocity between current and previous position
  velocity_calc AS (
    SELECT 
      ct.tile_id,
      CASE 
        WHEN prev.tile_id IS NOT NULL AND EXTRACT(EPOCH FROM (ct.updated_at - prev.updated_at)) > 0 THEN
          jsonb_build_object(
            'vx', (ct.lng - prev.lng) * 111320 * cos(radians(ct.lat)) / 
                  GREATEST(1, EXTRACT(EPOCH FROM (ct.updated_at - prev.updated_at))),
            'vy', (ct.lat - prev.lat) * 111320 / 
                  GREATEST(1, EXTRACT(EPOCH FROM (ct.updated_at - prev.updated_at))),
            'magnitude', sqrt(
              power((ct.lng - prev.lng) * 111320 * cos(radians(ct.lat)), 2) +
              power((ct.lat - prev.lat) * 111320, 2)
            ) / GREATEST(1, EXTRACT(EPOCH FROM (ct.updated_at - prev.updated_at))),
            'heading', atan2(
              (ct.lng - prev.lng) * 111320 * cos(radians(ct.lat)),
              (ct.lat - prev.lat) * 111320
            ),
            'confidence', LEAST(1.0, 
              exp(-EXTRACT(EPOCH FROM (ct.updated_at - prev.updated_at)) / 30)
            )
          )
        ELSE 
          jsonb_build_object(
            'vx', 0, 'vy', 0, 'magnitude', 0, 'heading', 0, 'confidence', 0
          )
      END as velocity
    FROM current_tiles ct
    LEFT JOIN LATERAL (
      SELECT 
        ft.tile_id,
        CASE WHEN ft.centroid IS NOT NULL THEN ST_X(ft.centroid::geometry) ELSE 0 END as lng,
        CASE WHEN ft.centroid IS NOT NULL THEN ST_Y(ft.centroid::geometry) ELSE 0 END as lat,
        ft.updated_at
      FROM field_tiles ft
      WHERE ft.tile_id = ct.tile_id
        AND ft.updated_at < ct.updated_at
        AND ft.updated_at > ct.updated_at - interval '30 seconds'
      ORDER BY ft.updated_at DESC
      LIMIT 1
    ) prev ON true
  ),
  
  -- Classify movement mode based on velocity
  movement_classification AS (
    SELECT 
      vc.tile_id,
      vc.velocity,
      CASE 
        WHEN (vc.velocity->>'magnitude')::numeric < 0.5 THEN 'stationary'
        WHEN (vc.velocity->>'magnitude')::numeric <= 2 THEN 'walking'
        WHEN (vc.velocity->>'magnitude')::numeric <= 8 THEN 'cycling'
        WHEN (vc.velocity->>'magnitude')::numeric <= 30 THEN 'driving'
        ELSE 'transit'
      END as movement_mode
    FROM velocity_calc vc
  ),
  
  -- Calculate momentum (stability of movement pattern)
  momentum_calc AS (
    SELECT 
      ct.tile_id,
      CASE 
        WHEN COUNT(ft.centroid) > 3 THEN
          GREATEST(0, LEAST(1, 
            1.0 - (
              COALESCE(stddev(CASE WHEN ft.centroid IS NOT NULL THEN ST_X(ft.centroid::geometry) ELSE 0 END), 0) + 
              COALESCE(stddev(CASE WHEN ft.centroid IS NOT NULL THEN ST_Y(ft.centroid::geometry) ELSE 0 END), 0)
            ) / 2.0
          ))
        ELSE 0.5
      END as momentum
    FROM current_tiles ct
    LEFT JOIN field_tiles ft ON ft.tile_id = ct.tile_id
      AND ft.updated_at > v_current_time - interval '2 minutes'
    GROUP BY ct.tile_id
  ),
  
  -- Calculate cohesion score (how tightly grouped)
  cohesion_calc AS (
    SELECT 
      ct.tile_id,
      CASE 
        WHEN COUNT(nearby.tile_id) > 0 THEN
          GREATEST(0, LEAST(1,
            exp(-COALESCE(variance(
              (nearby.avg_vibe->>'h')::numeric + 
              (nearby.avg_vibe->>'s')::numeric
            ), 0) / 100.0)
          ))
        ELSE 0
      END as cohesion_score
    FROM current_tiles ct
    LEFT JOIN field_tiles nearby ON 
      nearby.tile_id != ct.tile_id AND
      nearby.centroid IS NOT NULL AND
      (SELECT centroid FROM field_tiles WHERE tile_id = ct.tile_id) IS NOT NULL AND
      ST_DWithin(
        nearby.centroid::geography, 
        (SELECT centroid FROM field_tiles WHERE tile_id = ct.tile_id)::geography,
        100 -- 100 meter radius
      )
    GROUP BY ct.tile_id
  ),
  
  -- Calculate afterglow intensity based on recent activity
  afterglow_calc AS (
    SELECT 
      ct.tile_id,
      GREATEST(0, LEAST(1, 
        (1.0 - EXTRACT(EPOCH FROM (v_current_time - ct.updated_at)) / 60) *
        LEAST(1.0, ct.crowd_count::numeric / 50)
      )) as afterglow_intensity
    FROM current_tiles ct
  )
  
  -- Final result combining all calculations
  SELECT 
    ct.tile_id,
    ct.crowd_count,
    ct.avg_vibe,
    ct.active_floq_ids,
    ct.updated_at,
    mc.velocity,
    mc.movement_mode,
    th.history,
    COALESCE(mom.momentum, 0.5)::numeric,
    COALESCE(coh.cohesion_score, 0)::numeric,
    NULL::jsonb as convergence_vector, -- Will be computed client-side
    COALESCE(ag.afterglow_intensity, 0)::numeric
  FROM current_tiles ct
  LEFT JOIN tile_history th ON th.tile_id = ct.tile_id
  LEFT JOIN movement_classification mc ON mc.tile_id = ct.tile_id
  LEFT JOIN momentum_calc mom ON mom.tile_id = ct.tile_id
  LEFT JOIN cohesion_calc coh ON coh.tile_id = ct.tile_id
  LEFT JOIN afterglow_calc ag ON ag.tile_id = ct.tile_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_field_tiles_temporal 
ON field_tiles (tile_id, updated_at DESC);

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_field_tiles_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_field_tiles_enhanced TO anon;