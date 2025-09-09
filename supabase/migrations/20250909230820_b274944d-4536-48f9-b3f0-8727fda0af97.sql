-- ===================================================================
-- Cluster recent flow segments in a bbox into convergence points
-- No H3 extension needed; grouping via ST_SnapToGrid at a res-tuned
-- degree cell size, then precise centroid with ST_Centroid.
-- ===================================================================

CREATE OR REPLACE FUNCTION public.recent_convergence(
  west          double precision,
  south         double precision,
  east          double precision,
  north         double precision,
  since_minutes integer         DEFAULT 45,
  res           integer         DEFAULT 9,    -- 7..11 recommended
  min_points    integer         DEFAULT 3,
  limit_n       integer         DEFAULT 12
)
RETURNS TABLE (
  lng        double precision,
  lat        double precision,
  group_min  integer,
  prob       numeric,
  eta_min    integer
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
WITH
p AS (
  SELECT
    now() - make_interval(mins => greatest(1, coalesce(since_minutes,45))) AS since_ts,
    -- crude deg sizes tuned for 7..11; adjust if you want different "tightness"
    CASE greatest(7, least(11, coalesce(res,9)))
      WHEN 7  THEN 0.0100   -- ~1.1 km at equator
      WHEN 8  THEN 0.0070
      WHEN 9  THEN 0.0045
      WHEN 10 THEN 0.0030
      ELSE         0.0020
    END AS cell_deg,
    greatest(1, coalesce(min_points,3)) AS kmin,
    greatest(1, coalesce(limit_n,12))   AS kmax
),
box AS (
  SELECT ST_SetSRID(ST_MakeEnvelope(west, south, east, north), 4326) AS g
),
-- recent segments within bbox
segs AS (
  SELECT fs.center
  FROM flow_segments fs, p, box
  WHERE fs.arrived_at >= p.since_ts
    AND ST_Intersects(fs.center, box.g)
),
-- bucket by snapped grid; collect precise centroid inside each bucket
buckets AS (
  SELECT
    ST_Centroid(ST_Collect(center))   AS cent,
    count(*)::int                     AS n
  FROM segs, p
  GROUP BY ST_SnapToGrid(center, p.cell_deg, p.cell_deg)
  HAVING count(*) >= (SELECT kmin FROM p)
),
-- score & order
scored AS (
  SELECT
    ST_X(cent)                       AS lng,
    ST_Y(cent)                       AS lat,
    n                                AS group_min,
    -- simple probability/ETA heuristics like your overlay:
    least(0.95, 0.25 + 0.12 * n)::numeric AS prob,
    greatest(3, 15 - least(10, round(n/2.0)))::int AS eta_min
  FROM buckets
  ORDER BY n DESC
  LIMIT (SELECT kmax FROM p)
)
SELECT * FROM scored;
$$;

-- Grant execution to callers
GRANT EXECUTE ON FUNCTION public.recent_convergence(
  double precision, double precision, double precision, double precision,
  integer, integer, integer, integer
) TO authenticated, anon;