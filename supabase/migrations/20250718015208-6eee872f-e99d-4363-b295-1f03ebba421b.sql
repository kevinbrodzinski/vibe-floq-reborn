/*---------------------------------------------------------------
  GIN indexes for afterglow_moments metadata
----------------------------------------------------------------*/
CREATE INDEX IF NOT EXISTS idx_moments_metadata_path_ops
  ON public.afterglow_moments
  USING gin (metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_moments_location_venue
  ON public.afterglow_moments
  USING gin ((metadata -> 'location' -> 'venue_id'));

CREATE INDEX IF NOT EXISTS idx_moments_social_floq
  ON public.afterglow_moments
  USING gin ((metadata -> 'social_context' -> 'floq_id'));