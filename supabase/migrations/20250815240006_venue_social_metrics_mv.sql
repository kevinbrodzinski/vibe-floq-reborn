-- 06: stub MV (replace with real def when ready)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.venue_social_metrics AS
SELECT 0::uuid AS venue_id WHERE false;

CREATE UNIQUE INDEX IF NOT EXISTS ix_venue_social_metrics_pk
  ON public.venue_social_metrics (venue_id);

CREATE OR REPLACE FUNCTION public.refresh_venue_social_metrics() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.venue_social_metrics';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW public.venue_social_metrics';
  END;
END$$;