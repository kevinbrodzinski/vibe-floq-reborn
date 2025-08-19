-- 12A: MV
CREATE MATERIALIZED VIEW IF NOT EXISTS public.v_time_in_venue_daily AS
WITH split AS (
  SELECT s.profile_id, s.venue_id,
         g::date AS day,
         GREATEST(s.arrived_at, g)                  AS day_start,
         LEAST(s.departed_at, g + interval '1 day') AS day_end
  FROM public.venue_stays s
  CROSS JOIN LATERAL generate_series(
    date_trunc('day', s.arrived_at),
    date_trunc('day', s.departed_at),
    interval '1 day'
  ) AS g
)
SELECT venue_id,
       day,
       SUM(EXTRACT(EPOCH FROM (day_end - day_start)))::bigint AS seconds_in_venue,
       COUNT(DISTINCT profile_id)                              AS unique_visitors
FROM split
GROUP BY venue_id, day
WITH NO DATA;

-- 12B: indexes (run pk concurrently outside txn if needed)
CREATE UNIQUE INDEX IF NOT EXISTS ix_v_time_in_venue_daily_pk
  ON public.v_time_in_venue_daily (venue_id, day);

CREATE INDEX IF NOT EXISTS ix_v_time_in_venue_daily_day
  ON public.v_time_in_venue_daily (day);

CREATE INDEX IF NOT EXISTS ix_v_time_in_venue_daily_venue
  ON public.v_time_in_venue_daily (venue_id);

-- 12C: refresh wrapper
CREATE OR REPLACE FUNCTION public.refresh_time_in_venue() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_time_in_venue_daily';
  EXCEPTION WHEN OTHERS THEN
    EXECUTE 'REFRESH MATERIALIZED VIEW public.v_time_in_venue_daily';
  END;
END$$;