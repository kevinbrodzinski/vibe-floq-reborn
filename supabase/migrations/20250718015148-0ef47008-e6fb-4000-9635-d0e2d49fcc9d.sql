-- disable_ddl_transaction;   -- ← must be the first line!

/*---------------------------------------------------------------
  Non-blocking GIN indexes
----------------------------------------------------------------*/
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_metadata_path_ops
  ON public.afterglow_moments
  USING gin (metadata jsonb_path_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_location_venue
  ON public.afterglow_moments
  USING gin ((metadata -> 'location' -> 'venue_id'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_social_floq
  ON public.afterglow_moments
  USING gin ((metadata -> 'social_context' -> 'floq_id'));