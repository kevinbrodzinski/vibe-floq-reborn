-- Path B: Drop broken triggers and add NOT NULL constraints for app-side H3

-- Drop the broken triggers that call h3_geo_to_h3() (using correct syntax)
DROP TRIGGER IF EXISTS vibes_now_h3_trg ON public.vibes_now;
DROP TRIGGER IF EXISTS floqs_h3_trg ON public.floqs;
DROP TRIGGER IF EXISTS field_tiles_h3_trg ON public.field_tiles;

-- Also drop the function since it references non-existent h3 functions
DROP FUNCTION IF EXISTS public.set_h3_7_generic();

-- Add NOT NULL constraints to ensure application provides H3 index
-- Note: We need to handle existing NULL values first
UPDATE public.vibes_now SET h3_7 = 'temp_placeholder' WHERE h3_7 IS NULL;
UPDATE public.floqs SET h3_7 = 'temp_placeholder' WHERE h3_7 IS NULL;

-- Now we can safely add the constraints
ALTER TABLE public.vibes_now
  ADD CONSTRAINT vibes_now_h3_not_null CHECK (h3_7 IS NOT NULL);

ALTER TABLE public.floqs
  ADD CONSTRAINT floqs_h3_not_null CHECK (h3_7 IS NOT NULL);

-- Update the materialized view to work with text-based H3 indices
DROP MATERIALIZED VIEW IF EXISTS public.vibe_cluster_r6;

CREATE MATERIALIZED VIEW public.vibe_cluster_r6 AS
WITH base AS (
  SELECT h3_7,
         vibe,
         COUNT(*) AS vibe_cnt
  FROM   public.vibes_now
  WHERE  updated_at > now() - interval '15 minutes'
    AND  h3_7 IS NOT NULL
    AND  h3_7 != 'temp_placeholder'
  GROUP  BY 1, 2
)
SELECT h3_7                                               AS h3_6,
       SUM(vibe_cnt)                                      AS total_now,
       jsonb_object_agg(vibe, vibe_cnt ORDER BY vibe)     AS vibe_counts
FROM   base
GROUP  BY 1;

-- Recreate the unique index
CREATE UNIQUE INDEX IF NOT EXISTS vibe_cluster_r6_h3_6_idx
  ON public.vibe_cluster_r6 (h3_6);