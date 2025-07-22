-- Rename old column if it slipped in
-- (safe-guard: runs even if it doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'field_tiles'
      AND column_name = 'avg_vibe_hsv'
  ) THEN
    ALTER TABLE public.field_tiles
      RENAME COLUMN avg_vibe_hsv TO avg_vibe;
  END IF;
END$$;

-- Replace the function with correct column names
CREATE OR REPLACE FUNCTION public.refresh_field_tiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.field_tiles
    (tile_id, crowd_count, avg_vibe, active_floq_ids, updated_at)
  SELECT
    gh5,
    COUNT(*),
    jsonb_build_object(
      'h', AVG((vibe_hsv->>0)::float),
      's', AVG((vibe_hsv->>1)::float),
      'l', AVG((vibe_hsv->>2)::float)
    ),
    array_agg(DISTINCT floq_id) FILTER (WHERE floq_id IS NOT NULL),
    now()
  FROM public.vibes_now
  WHERE gh5 IS NOT NULL
  GROUP BY gh5
  ON CONFLICT (tile_id) DO UPDATE
    SET crowd_count     = EXCLUDED.crowd_count,
        avg_vibe        = EXCLUDED.avg_vibe,
        active_floq_ids = EXCLUDED.active_floq_ids,
        updated_at      = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_field_tiles() TO authenticated;