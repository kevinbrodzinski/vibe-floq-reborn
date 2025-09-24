-- Create indexes for vibe_clusters materialized view
-- Using regular indexes since CONCURRENTLY cannot run in transactions

CREATE UNIQUE INDEX IF NOT EXISTS vibe_clusters_gh6_idx 
ON public.vibe_clusters (gh6);

CREATE INDEX IF NOT EXISTS vibe_clusters_hot_idx 
ON public.vibe_clusters (vibe_momentum) 
WHERE vibe_momentum > 5.0;