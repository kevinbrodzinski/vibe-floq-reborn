/* ============================================================
   Phase 3-A – Social-Glow / Compatibility foundation
   ============================================================ */

BEGIN;

----------------------------------------------------------------
-- 1.  Compatibility lookup table  (one row per unordered pair)
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vibe_similarity (
  vibe_low  vibe_enum NOT NULL,
  vibe_high vibe_enum NOT NULL,
  score     real      NOT NULL CHECK (score BETWEEN 0 AND 1),
  CHECK (vibe_low <= vibe_high),          -- enforce canonical ordering
  PRIMARY KEY (vibe_low, vibe_high)
);

COMMENT ON TABLE  public.vibe_similarity IS
  'Compatibility scores between two vibes.  Stores only (low,high) to avoid duplicates.';
COMMENT ON COLUMN public.vibe_similarity.score IS
  '0 = incompatible, 1 = perfect match.';

-- tighter autovacuum for this tiny hot table
ALTER TABLE public.vibe_similarity
  SET (autovacuum_vacuum_scale_factor = 0.05);

-- Upsert matrix (self-rows + curated pairs)
WITH pairs(a,b,score) AS (
  VALUES
    -- identical
    ('chill'::vibe_enum,'chill'::vibe_enum,1.0), ('down'::vibe_enum,'down'::vibe_enum,1.0), ('flowing'::vibe_enum,'flowing'::vibe_enum,1.0),
    ('hype'::vibe_enum,'hype'::vibe_enum,1.0),   ('open'::vibe_enum,'open'::vibe_enum,1.0), ('romantic'::vibe_enum,'romantic'::vibe_enum,1.0),
    ('social'::vibe_enum,'social'::vibe_enum,1.0),('solo'::vibe_enum,'solo'::vibe_enum,1.0),('weird'::vibe_enum,'weird'::vibe_enum,1.0),

    -- high (0.7-0.8)
    ('chill'::vibe_enum,'down'::vibe_enum,0.8),   ('chill'::vibe_enum,'solo'::vibe_enum,0.7),
    ('flowing'::vibe_enum,'social'::vibe_enum,0.8),('open'::vibe_enum,'romantic'::vibe_enum,0.7),
    ('hype'::vibe_enum,'social'::vibe_enum,0.7),  ('open'::vibe_enum,'weird'::vibe_enum,0.8),

    -- medium (0.5-0.6)
    ('chill'::vibe_enum,'flowing'::vibe_enum,0.5), ('flowing'::vibe_enum,'romantic'::vibe_enum,0.6),
    ('hype'::vibe_enum,'open'::vibe_enum,0.5),     ('down'::vibe_enum,'solo'::vibe_enum,0.6),
    ('hype'::vibe_enum,'weird'::vibe_enum,0.5),

    -- low (0.3-0.4)
    ('chill'::vibe_enum,'romantic'::vibe_enum,0.3),('open'::vibe_enum,'social'::vibe_enum,0.4),
    ('down'::vibe_enum,'flowing'::vibe_enum,0.3),

    -- weak (0.2)
    ('social'::vibe_enum,'solo'::vibe_enum,0.2),  ('chill'::vibe_enum,'hype'::vibe_enum,0.2), ('down'::vibe_enum,'weird'::vibe_enum,0.2)
)
INSERT INTO public.vibe_similarity (vibe_low, vibe_high, score)
SELECT LEAST(a,b), GREATEST(a,b), score
FROM pairs
ON CONFLICT (vibe_low, vibe_high) DO UPDATE
  SET score = EXCLUDED.score;

----------------------------------------------------------------
-- 2.  Symmetric helper function (NULL-safe)
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vibe_similarity(a vibe_enum, b vibe_enum)
RETURNS real
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$
  SELECT COALESCE(
           (SELECT score
              FROM public.vibe_similarity
             WHERE (vibe_low,vibe_high) = (LEAST(a,b), GREATEST(a,b))),
           0.0);
$$;

COMMENT ON FUNCTION public.vibe_similarity(vibe_enum,vibe_enum) IS
'Return compatibility score for two vibes (ordering handled). Returns 0.0 when pair absent.';

----------------------------------------------------------------
-- 3.  Add pre-computed dominant-vibe cols to vibe_clusters
--     (drop / recreate the MV so the columns persist across refreshes)
----------------------------------------------------------------
-- If the columns are already in the SELECT list from a previous run,
-- this block is skipped.
DO $$
BEGIN
  IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name   ='vibe_clusters'
          AND column_name  ='dom_vibe'
     )
  THEN
    -- drop + recreate MV with new columns (handle dependencies)
    DROP MATERIALIZED VIEW IF EXISTS public.vibe_clusters CASCADE;

    CREATE MATERIALIZED VIEW public.vibe_clusters AS
    WITH live_filtered AS (           -- ⬅️  same body you already use …
      SELECT
        ST_GeoHash(uvs.location::geometry,6) AS gh6,
        uvs.vibe_tag,
        uvs.location::geometry               AS geom,
        uvs.started_at
      FROM public.user_vibe_states uvs
      WHERE uvs.active
        AND uvs.started_at > (now() - interval '90 minutes')
        AND uvs.location IS NOT NULL
    ),
    vibe_counts AS (
      SELECT
        gh6,
        jsonb_object_agg(vibe_tag,cnt)               AS vibe_counts,
        SUM(cnt)::bigint                             AS total,
        ST_PointOnSurface(ST_Collect(geom))::geography AS centroid
      FROM (
        SELECT gh6, vibe_tag, COUNT(*) AS cnt, geom
        FROM live_filtered
        GROUP BY gh6, vibe_tag, geom
      ) sub
      GROUP BY gh6
      HAVING SUM(cnt) >= 3
    )
    SELECT
      gh6,
      centroid,
      total,
      vibe_counts,
      -- pre-computed dominant vibe + count
      (SELECT key::vibe_enum
         FROM jsonb_each(vibe_counts)
         ORDER BY value::int DESC LIMIT 1)   AS dom_vibe,
      (SELECT (value::int)
         FROM jsonb_each(vibe_counts)
         ORDER BY value::int DESC LIMIT 1)   AS dom_count
    FROM vibe_counts
    ORDER BY total DESC
    WITH DATA;
  END IF;
END $$;

-- Spatial index (if not already present)
CREATE INDEX IF NOT EXISTS vibe_clusters_centroid_gix
  ON public.vibe_clusters USING GIST (centroid);

-- Optional BTREE on dom_vibe if you plan to filter by it
CREATE INDEX IF NOT EXISTS vibe_clusters_dom_idx
  ON public.vibe_clusters(dom_vibe);

----------------------------------------------------------------
-- 4.  RPC → get_compat_clusters
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_compat_clusters(
  u_lat     double precision,
  u_lng     double precision,
  u_vibe    vibe_enum,
  radius_m  int DEFAULT 1000,
  limit_n   int DEFAULT 3
)
RETURNS TABLE (
  gh6        text,
  centroid   geography,
  dom_vibe   vibe_enum,
  vibe_match real,
  distance_m real,
  user_count int
)
LANGUAGE sql SECURITY DEFINER PARALLEL SAFE AS
$$
  SELECT
    vc.gh6,
    vc.centroid,
    vc.dom_vibe,
    public.vibe_similarity(u_vibe, vc.dom_vibe)            AS vibe_match,
    ST_Distance(vc.centroid, ST_MakePoint(u_lng,u_lat))     AS distance_m,
    vc.dom_count                                            AS user_count
  FROM public.vibe_clusters vc
  WHERE ST_DWithin(vc.centroid,
                   ST_MakePoint(u_lng,u_lat),
                   radius_m)
    AND public.vibe_similarity(u_vibe, vc.dom_vibe) > 0.2
  ORDER BY vibe_match DESC, distance_m ASC
  LIMIT limit_n;
$$;

COMMENT ON FUNCTION public.get_compat_clusters IS
'Return up to N nearby clusters whose dominant vibe is compatible (>0.2) with the user vibe.';

----------------------------------------------------------------
-- 5.  Permissions & RLS
----------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_compat_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION public.vibe_similarity     TO authenticated;
GRANT SELECT  ON TABLE    public.vibe_similarity     TO authenticated;

-- Read-only RLS for regular users
ALTER TABLE public.vibe_similarity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vibe_similarity_read_only  ON public.vibe_similarity;
DROP POLICY IF EXISTS vibe_similarity_no_modify  ON public.vibe_similarity;

CREATE POLICY vibe_similarity_read_only
  ON public.vibe_similarity
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY vibe_similarity_no_modify
  ON public.vibe_similarity
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

COMMIT;