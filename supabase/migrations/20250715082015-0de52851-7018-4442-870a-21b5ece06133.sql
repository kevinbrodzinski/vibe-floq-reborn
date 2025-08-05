-- Create indexes for vibe_clusters materialized view with CONCURRENTLY
-- These run outside transaction blocks to avoid exclusive locks

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS vibe_clusters_gh6_idx 
ON public.vibe_clusters (gh6);

CREATE INDEX CONCURRENTLY IF NOT EXISTS vibe_clusters_hot_idx 
ON public.vibe_clusters (vibe_momentum) 
WHERE vibe_momentum > 5.0;