/* ------------------------------------------------------------------ *
 *  2025-08-02  ▸  Comprehensive "venues" table fix-up
 * ------------------------------------------------------------------ *
 *  – Adds any missing columns (vibe, external_id, description, geom…)
 *  – Back-fills   location ⇄ geom ⇄ lat/lng,   provider → source
 *  – Re-keys uniqueness on (source, external_id)
 *  – Spatial / attribute indexes
 *  – Rebuilds helper functions (cluster + bbox)
 *  – Ensures simple read-only RLS policy
 * ------------------------------------------------------------------ */

BEGIN;

/* ───────────────────────── 1 ▸ Patch missing columns ────────────── */
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'vibe')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN vibe TEXT DEFAULT 'mixed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'external_id')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN external_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'description')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'location')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN location GEOGRAPHY(POINT,4326);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'geom')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN geom GEOMETRY(Point,4326);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'price_tier')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN price_tier TEXT DEFAULT '$';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'venues' AND column_name = 'source')
  THEN
    ALTER TABLE public.venues
      ADD COLUMN source TEXT DEFAULT 'manual';
  END IF;
END $$;

/* ───────────────────────── 2 ▸ One-off data repair ──────────────── */

-- 2.a  external_id ← provider_id
UPDATE public.venues
SET    external_id = provider_id
WHERE  external_id IS NULL
  AND  provider_id IS NOT NULL;

-- 2.b  source ← provider
UPDATE public.venues
SET    source = provider
WHERE (source IS NULL OR source = 'manual')
  AND  provider IS NOT NULL;

-- 2.c  location ← lat/lng
UPDATE public.venues
SET    location = ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography
WHERE  location IS NULL
  AND  lat IS NOT NULL
  AND  lng IS NOT NULL;

-- 2.d  geom ← location / lat-lng   (only if geom is *not* generated)
DO $$
DECLARE
  is_gen BOOLEAN;
BEGIN
  SELECT (is_generated = 'ALWAYS')
  INTO   is_gen
  FROM   information_schema.columns
  WHERE  table_schema = 'public'
    AND  table_name   = 'venues'
    AND  column_name  = 'geom';

  IF NOT is_gen THEN
    UPDATE public.venues
    SET    geom = COALESCE(
             location::geometry,
             ST_SetSRID(ST_MakePoint(lng,lat),4326)
           )
    WHERE  geom IS NULL
      AND (location IS NOT NULL
           OR (lat IS NOT NULL AND lng IS NOT NULL));
  END IF;
END $$;

/* ───────────────────────── 3 ▸ Re-key uniqueness ────────────────── */

-- Drop legacy key on (provider,provider_id) if present
ALTER TABLE public.venues
  DROP CONSTRAINT IF EXISTS venues_provider_provider_id_key;

-- Ensure new unique key on (source, external_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conname  = 'venues_source_external_id_key'
       AND conrelid = 'public.venues'::regclass
  ) THEN
    ALTER TABLE public.venues
      ADD CONSTRAINT venues_source_external_id_key
      UNIQUE (source, external_id);
  END IF;
END $$;

/* ───────────────────────── 4 ▸ Indexes ──────────────────────────── */

CREATE INDEX IF NOT EXISTS idx_venues_geom_gist       ON public.venues USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_venues_vibe            ON public.venues(vibe);
CREATE INDEX IF NOT EXISTS idx_venues_source          ON public.venues(source);
CREATE INDEX IF NOT EXISTS idx_venues_external_id     ON public.venues(external_id);
CREATE INDEX IF NOT EXISTS idx_venues_live_count      ON public.venues(live_count);
CREATE INDEX IF NOT EXISTS idx_venues_popularity      ON public.venues(popularity);
CREATE INDEX IF NOT EXISTS idx_venues_vibe_score      ON public.venues(vibe_score);

CREATE INDEX IF NOT EXISTS idx_venues_location_vibe
  ON public.venues USING BTREE(vibe)
  WHERE geom IS NOT NULL;

/* ───────────────────────── 5 ▸ Helper functions ─────────────────── */

-- (A) Cluster fetch
CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng DOUBLE PRECISION,
  min_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  cursor_popularity INTEGER DEFAULT NULL,
  cursor_id TEXT DEFAULT NULL,
  limit_rows INTEGER DEFAULT 10
) RETURNS TABLE(
  id TEXT,
  name TEXT,
  category TEXT,
  lat NUMERIC,
  lng NUMERIC,
  vibe_score NUMERIC,
  live_count INTEGER,
  popularity INTEGER,
  vibe TEXT,
  source TEXT,
  external_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id::text,
    v.name,
    COALESCE(array_to_string(v.categories, ', '), 'venue'),
    ST_Y(v.geom),
    ST_X(v.geom),
    COALESCE(v.vibe_score,50.0),
    COALESCE(v.live_count,0),
    COALESCE(v.popularity,0),
    COALESCE(v.vibe,'mixed'),
    v.source,
    v.external_id
  FROM public.venues v
  WHERE ST_Intersects(
          v.geom,
          ST_MakeEnvelope(min_lng,min_lat,max_lng,max_lat,4326)
        )
    AND (
          cursor_popularity IS NULL
          OR cursor_id IS NULL
          OR (COALESCE(v.popularity,0),v.id) <
             (cursor_popularity,cursor_id)
        )
  ORDER BY v.popularity DESC, v.id DESC
  LIMIT limit_rows;
END;
$$;

-- (B) Simple bbox fetch
CREATE OR REPLACE FUNCTION public.get_venues_in_bbox(
  west  DOUBLE PRECISION,
  south DOUBLE PRECISION,
  east  DOUBLE PRECISION,
  north DOUBLE PRECISION
) RETURNS TABLE(
  id TEXT,
  name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  vibe TEXT,
  source TEXT,
  external_id TEXT,
  categories TEXT[],
  rating NUMERIC,
  photo_url TEXT,
  address TEXT,
  live_count INTEGER,
  popularity INTEGER,
  vibe_score NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id::text,
    v.name,
    ST_Y(v.geom),
    ST_X(v.geom),
    COALESCE(v.vibe,'mixed'),
    v.source,
    v.external_id,
    COALESCE(v.categories,ARRAY[]::text[]),
    v.rating,
    v.photo_url,
    v.address,
    COALESCE(v.live_count,0),
    COALESCE(v.popularity,0),
    COALESCE(v.vibe_score,50.0),
    v.created_at,
    v.updated_at
  FROM public.venues v
  WHERE ST_Intersects(
          v.geom,
          ST_MakeEnvelope(west,south,east,north,4326)
        )
  ORDER BY v.popularity DESC NULLS LAST,
           v.created_at DESC
  LIMIT 500;
END;
$$;

/* ───────────────────────── 6 ▸ RLS (read-only) ──────────────────── */

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  tablename = 'venues'
      AND  policyname = 'venues_public_read'
  ) THEN
    CREATE POLICY venues_public_read
      ON public.venues
      FOR SELECT
      USING (true);
  END IF;
END $$;

COMMIT;