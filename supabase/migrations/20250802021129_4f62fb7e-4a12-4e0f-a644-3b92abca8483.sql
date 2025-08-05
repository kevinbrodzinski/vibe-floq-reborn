-- Path B: Drop broken triggers and add NOT NULL constraints for app-side H3

-- Drop the broken triggers that call h3_geo_to_h3()
ALTER TABLE public.vibes_now DROP TRIGGER IF EXISTS vibes_now_h3_trg;
ALTER TABLE public.floqs DROP TRIGGER IF EXISTS floqs_h3_trg;
ALTER TABLE public.field_tiles DROP TRIGGER IF EXISTS field_tiles_h3_trg;

-- Add NOT NULL constraints to ensure application provides H3 index
ALTER TABLE public.vibes_now
  ADD CONSTRAINT vibes_now_h3_not_null CHECK (h3_7 IS NOT NULL);

ALTER TABLE public.floqs
  ADD CONSTRAINT floqs_h3_not_null CHECK (h3_7 IS NOT NULL);

-- Keep the field_tiles constraint optional since it's only used for aggregation
-- ALTER TABLE public.field_tiles
--   ADD CONSTRAINT field_tiles_h3_not_null CHECK (h3_7 IS NOT NULL);

-- Update the materialized view to use text conversion
DROP MATERIALIZED VIEW IF EXISTS public.vibe_cluster_r6;

CREATE MATERIALIZED VIEW public.vibe_cluster_r6 AS
WITH base AS (
  SELECT h3_7,
         vibe,
         COUNT(*) AS vibe_cnt
  FROM   public.vibes_now
  WHERE  updated_at > now() - interval '15 minutes'
    AND  h3_7 IS NOT NULL
  GROUP  BY 1, 2
)
SELECT h3_7::text                                         AS h3_6,
       SUM(vibe_cnt)                                      AS total_now,
       jsonb_object_agg(vibe, vibe_cnt ORDER BY vibe)     AS vibe_counts
FROM   base
GROUP  BY 1;

-- Recreate the unique index
CREATE UNIQUE INDEX IF NOT EXISTS vibe_cluster_r6_h3_6_idx
  ON public.vibe_cluster_r6 (h3_6);