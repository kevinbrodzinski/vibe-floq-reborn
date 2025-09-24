-- Create indexes for vibe_clusters materialized view
-- Note: CONCURRENTLY cannot be used inside transaction blocks, 
-- so these must be run outside of a transaction

CREATE UNIQUE INDEX CONCURRENTLY vibe_clusters_gh6_idx 
ON public.vibe_clusters (gh6) 
WITH (fillfactor = 90);

CREATE INDEX CONCURRENTLY vibe_clusters_hot_idx 
ON public.vibe_clusters (vibe_momentum) 
WHERE vibe_momentum > 5.0
WITH (fillfactor = 90);