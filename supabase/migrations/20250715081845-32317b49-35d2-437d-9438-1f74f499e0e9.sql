-- Enhanced vibe_clusters materialized view with popularity and momentum
-- Production-optimized version with better performance

DROP MATERIALIZED VIEW IF EXISTS public.vibe_clusters;

CREATE MATERIALIZED VIEW public.vibe_clusters AS
WITH live_filtered AS (
  SELECT 
    ST_GeoHash(uvs.location::geometry, 6) as gh6,
    uvs.vibe_tag,
    uvs.location::geometry as geom,
    uvs.started_at
  FROM public.user_vibe_states uvs
  WHERE uvs.active = TRUE 
    AND uvs.started_at > (now() - interval '90 minutes')
    AND uvs.location IS NOT NULL
),
vibe_counts_with_momentum AS (
  SELECT 
    gh6, 
    vibe_tag,
    COUNT(*) as cnt,
    -- Calculate popularity (total activity in area)
    COUNT(*) * EXP(-EXTRACT(EPOCH FROM (now() - MAX(started_at))) / 3600.0) as popularity,
    -- Calculate momentum (recent activity boost)
    CASE 
      WHEN MAX(started_at) > (now() - interval '15 minutes') 
      THEN COUNT(*) * 2.0 
      ELSE 0.0 
    END as momentum,
    -- Collect geometries for centroid calculation
    ST_Collect(geom) as geom_collection
  FROM live_filtered
  GROUP BY gh6, vibe_tag
),
cluster_aggregates AS (
  SELECT 
    gh6,
    ST_Centroid(ST_Collect(geom_collection)) as centroid,
    SUM(cnt)::bigint as total,
    jsonb_object_agg(vibe_tag, cnt) as vibe_counts,
    SUM(popularity) as vibe_popularity,
    SUM(momentum) as vibe_momentum
  FROM vibe_counts_with_momentum
  GROUP BY gh6
  HAVING SUM(cnt) >= 3
)
SELECT 
  gh6,
  centroid,
  total,
  vibe_counts,
  vibe_popularity,
  vibe_momentum,
  now() as last_updated
FROM cluster_aggregates
ORDER BY total DESC;