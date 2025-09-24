-- 14: MV for hourly distinct presence
CREATE MATERIALIZED VIEW IF NOT EXISTS public.venue_hourly_presence AS
SELECT venue_id,
       date_trunc('hour', updated_at) AS hour_ts,
       COUNT(DISTINCT profile_id)      AS users
FROM public.presence
WHERE venue_id IS NOT NULL
GROUP BY venue_id, hour_ts
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS ix_venue_hourly_presence_pk
  ON public.venue_hourly_presence (venue_id, hour_ts);

CREATE OR REPLACE FUNCTION public.refresh_venue_hourly_presence() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.venue_hourly_presence';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW public.venue_hourly_presence';
  END;
END$$;