-- Add Spatial Index Columns to Existing Tables (Migration-Safe)
-- Adds h3_idx and geohash6 columns for V2 hybrid spatial indexing strategy

-- ========================================
-- 1. Add spatial index columns to vibes_now table
-- ========================================

-- Add columns if they don't exist
ALTER TABLE public.vibes_now 
ADD COLUMN IF NOT EXISTS h3_idx BIGINT,
ADD COLUMN IF NOT EXISTS geohash6 TEXT;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_vibes_now_h3_idx 
  ON public.vibes_now(h3_idx) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vibes_now_geohash6 
  ON public.vibes_now(geohash6) WHERE geohash6 IS NOT NULL;

-- ========================================
-- 2. Add spatial index columns to presence table
-- ========================================

-- Add columns if they don't exist
ALTER TABLE public.presence 
ADD COLUMN IF NOT EXISTS h3_idx BIGINT,
ADD COLUMN IF NOT EXISTS geohash6 TEXT;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_presence_h3_idx 
  ON public.presence(h3_idx) WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_geohash6 
  ON public.presence(geohash6) WHERE geohash6 IS NOT NULL;

-- ========================================
-- 3. Add spatial index columns to location_history table (optional)
-- ========================================

-- Add columns if they don't exist (for future analytics)
ALTER TABLE public.location_history 
ADD COLUMN IF NOT EXISTS h3_idx BIGINT,
ADD COLUMN IF NOT EXISTS geohash6 TEXT;

-- Create indexes (only if needed for analytics queries)
CREATE INDEX IF NOT EXISTS idx_location_history_h3_idx 
  ON public.location_history(h3_idx) WHERE h3_idx IS NOT NULL;

-- ========================================
-- 4. Update existing records with spatial indexes (optional backfill)
-- ========================================

-- FIXED: Function to backfill geohash6 for existing records with RLS bypass
CREATE OR REPLACE FUNCTION public.backfill_spatial_indexes_batch(
  p_table_name TEXT,
  p_batch_size INTEGER DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER := 0;
  v_sql TEXT;
BEGIN
  -- FIXED: Set role for RLS bypass
  PERFORM set_config('role', 'postgres', true);
  
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN ('vibes_now', 'presence', 'location_history') THEN
    RETURN '{"error": "Invalid table name"}'::jsonb;
  END IF;

  -- Build dynamic SQL for the specific table
  v_sql := format(
    'UPDATE public.%I SET 
     geohash6 = ST_GeoHash(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 6)
     WHERE geohash6 IS NULL 
     AND lat IS NOT NULL 
     AND lng IS NOT NULL
     AND ctid IN (
       SELECT ctid FROM public.%I 
       WHERE geohash6 IS NULL 
       AND lat IS NOT NULL 
       AND lng IS NOT NULL
       LIMIT %L
     )',
    p_table_name, p_table_name, p_batch_size
  );

  -- Execute the update
  EXECUTE v_sql;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'table', p_table_name,
    'updated_rows', v_updated,
    'batch_size', p_batch_size,
    'has_more', v_updated = p_batch_size
  );
END;
$$;

-- FIXED: Ensure function ownership and permissions
ALTER FUNCTION public.backfill_spatial_indexes_batch(TEXT, INTEGER) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.backfill_spatial_indexes_batch(TEXT, INTEGER) TO service_role;

-- ========================================
-- 5. Comments for documentation
-- ========================================

COMMENT ON COLUMN public.vibes_now.h3_idx IS 'H3 spatial index (bigint) computed client-side for fast neighbor queries';
COMMENT ON COLUMN public.vibes_now.geohash6 IS 'Geohash-6 spatial index (text) computed server-side for prefix queries';

COMMENT ON COLUMN public.presence.h3_idx IS 'H3 spatial index (bigint) computed client-side for fast neighbor queries';
COMMENT ON COLUMN public.presence.geohash6 IS 'Geohash-6 spatial index (text) computed server-side for prefix queries';

COMMENT ON COLUMN public.location_history.h3_idx IS 'H3 spatial index (bigint) for analytics queries';
COMMENT ON COLUMN public.location_history.geohash6 IS 'Geohash-6 spatial index (text) for analytics queries';

COMMENT ON FUNCTION public.backfill_spatial_indexes_batch(TEXT, INTEGER) IS 'Backfill geohash6 values for existing records in batches (service role only)';