-- Remove CHECK constraint on location_metrics.metric_name to allow flexible metric types
ALTER TABLE public.location_metrics
  DROP CONSTRAINT IF EXISTS location_metrics_metric_chk;