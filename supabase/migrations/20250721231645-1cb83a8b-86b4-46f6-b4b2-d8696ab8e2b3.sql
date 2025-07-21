-- Add partial index for ultra-fast cache reads
CREATE INDEX IF NOT EXISTS idx_transit_cache_active 
ON public.plan_transit_cache (from_stop_id, to_stop_id) 
WHERE updated_at > now() - interval '1 day';