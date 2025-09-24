/*─────────────────────────────  0. Prereqs  ─────────────────────────────*/
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS h3;           -- https://github.com/bytesandbrains/h3-pg

/*─────────────────────────────  1. Columns  ─────────────────────────────*/

/* 1-A. Presence "vibes_now" table  ──────────────────────────────────────*/
ALTER TABLE public.vibes_now
  -- store as native h3index (64-bit int) and validate it
  ADD COLUMN IF NOT EXISTS h3_7 h3index,
  ADD CONSTRAINT vibes_now_h3_7_valid CHECK (h3_is_valid(h3_7));

/* 1-B. Active "floqs" table  ────────────────────────────────────────────*/
ALTER TABLE public.floqs
  ADD COLUMN IF NOT EXISTS h3_7 h3index,
  ADD CONSTRAINT floqs_h3_7_valid CHECK (h3_is_valid(h3_7));

/* 1-C. Field aggregation "field_tiles"  (only if you **do** store a geom)*/
-- If tile_id is already the H3 cell → skip, else keep both
ALTER TABLE public.field_tiles
  ADD COLUMN IF NOT EXISTS h3_7 h3index,
  ADD CONSTRAINT field_tiles_h3_7_valid CHECK (h3_is_valid(h3_7));


/*─────────────────────────────  2. Triggers  ────────────────────────────*/
CREATE OR REPLACE FUNCTION public.set_h3_7_generic()  -- one shared fn
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.location IS NOT NULL THEN
    NEW.h3_7 :=
      h3_geo_to_h3(
        ST_Y(NEW.location)::double precision,
        ST_X(NEW.location)::double precision,
        7);
  END IF;
  RETURN NEW;
END;
$$;

-- vibes_now
DROP TRIGGER IF EXISTS vibes_now_h3_trg ON public.vibes_now;
CREATE TRIGGER vibes_now_h3_trg
BEFORE INSERT OR UPDATE ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.set_h3_7_generic();

-- floqs
DROP TRIGGER IF EXISTS floqs_h3_trg ON public.floqs;
CREATE TRIGGER floqs_h3_trg
BEFORE INSERT OR UPDATE ON public.floqs
FOR EACH ROW EXECUTE FUNCTION public.set_h3_7_generic();

-- ⚠️  field_tiles: *only* keep this trigger if you also store a geometry column
-- DROP TRIGGER IF EXISTS field_tiles_h3_trg ON public.field_tiles;
-- CREATE TRIGGER field_tiles_h3_trg
-- BEFORE INSERT OR UPDATE ON public.field_tiles
-- FOR EACH ROW EXECUTE FUNCTION public.set_h3_7_generic();


/*─────────────────────────────  3. Indexes  ─────────────────────────────*/
-- plain b-tree on h3index is plenty fast
CREATE INDEX IF NOT EXISTS vibes_now_h3_7_ix     ON public.vibes_now (h3_7);
CREATE INDEX IF NOT EXISTS floqs_h3_7_ix         ON public.floqs     (h3_7);
CREATE INDEX IF NOT EXISTS field_tiles_h3_7_ix   ON public.field_tiles (h3_7);

-- two-column index for recent-window queries (15-min TTL)
CREATE INDEX IF NOT EXISTS vibes_now_recent_h3_ix
  ON public.vibes_now (h3_7, updated_at DESC);


/*─────────────────────────────  4. Back-fill  ───────────────────────────*/
-- WARNING: on a large table run in batches to keep WAL small
UPDATE public.vibes_now
SET    h3_7 = h3_geo_to_h3(ST_Y(location), ST_X(location), 7)
WHERE  h3_7 IS NULL
  AND  location IS NOT NULL;

UPDATE public.floqs
SET    h3_7 = h3_geo_to_h3(ST_Y(location), ST_X(location), 7)
WHERE  h3_7 IS NULL
  AND  location IS NOT NULL;

/* field_tiles back-fill only if needed                                     */
UPDATE public.field_tiles
SET    h3_7 = h3_geo_to_h3(ST_Y(location), ST_X(location), 7)
WHERE  h3_7 IS NULL
  AND  location IS NOT NULL;


/*─────────────────────────────  5. Materialised roll-up  ─────────────────*/
-- Resolution-6 (= parent of 7) crowd/vibe snapshot for the last 15 min
CREATE MATERIALIZED VIEW IF NOT EXISTS public.vibe_cluster_r6 AS
WITH base AS (
  SELECT h3_to_parent(h3_7, 6)  AS h3_6,
         vibe,
         COUNT(*)              AS vibe_cnt
  FROM   public.vibes_now
  WHERE  updated_at > now() - interval '15 minutes'
    AND  h3_7 IS NOT NULL
  GROUP  BY 1, 2
)
SELECT h3_6::text                                         AS h3_6,
       SUM(vibe_cnt)                                      AS total_now,
       jsonb_object_agg(vibe, vibe_cnt ORDER BY vibe)     AS vibe_counts
FROM   base
GROUP  BY 1;

-- unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS vibe_cluster_r6_h3_6_idx
  ON public.vibe_cluster_r6 (h3_6);

/* refresh helper (cron every N seconds) */
CREATE OR REPLACE FUNCTION public.refresh_vibe_cluster_r6()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vibe_cluster_r6;
END;
$$;


/*─────────────────────────────  6. Done  ────────────────────────────────*/
COMMENT ON EXTENSION h3 IS
  'Adds h3index type and geoToH3 / h3_to_parent functions for hex-grid geo-indexing';