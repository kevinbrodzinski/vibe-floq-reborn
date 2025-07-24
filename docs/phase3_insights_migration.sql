/* =============================================================
   Phase 3: Insights & Year-Recap - Applied manually
   ============================================================= */

/* ──────────────────────────────────────────────────────────
   A-01  update_venue_popularity()  + nightly cron
   ──────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.update_venue_popularity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* popularity = unique visitors in the past 30 days */
  WITH agg AS (
    SELECT venue_id,
           COUNT(DISTINCT user_id) AS hits_30d
    FROM   public.venue_stays
    WHERE  arrived_at >= now() - INTERVAL '30 days'
    GROUP  BY venue_id
  )
  UPDATE public.venues v
  SET    popularity = COALESCE(a.hits_30d, 0)
  FROM   agg a
  WHERE  a.venue_id = v.id;
END;
$$;

-----------------------------------------------------------------
-- idempotent rescheduler (runs at 02:10 UTC every day)
-----------------------------------------------------------------
DO $$
DECLARE jid int;
BEGIN
  SELECT jobid INTO jid
  FROM   cron.job
  WHERE  jobname = 'venue_popularity_nightly';

  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);        -- remove previous copy
  END IF;

  PERFORM cron.schedule(
    'venue_popularity_nightly',
    '10 2 * * *',
    'SELECT public.update_venue_popularity();'
  );
END$$;

/* =============================================================
   A-02  v_time_in_venue_daily  (materialised view)
   ============================================================= */

-- 1. drop old object if it exists
DROP MATERIALIZED VIEW IF EXISTS public.v_time_in_venue_daily CASCADE;

-- 2. fresh MV
CREATE MATERIALIZED VIEW public.v_time_in_venue_daily AS
SELECT
  user_id,
  date_trunc('day', arrived_at)::date                            AS day,
  SUM(
    EXTRACT(
      EPOCH FROM COALESCE(departed_at, arrived_at) - arrived_at
    )
  ) / 60                                                         AS minutes_spent
FROM public.venue_stays
WHERE arrived_at >= now() - INTERVAL '90 days'
GROUP BY user_id, day;

-- 3. unique index (required for CONCURRENTLY refreshes)
CREATE UNIQUE INDEX idx_mv_time_in_venue_daily_uid_day
    ON public.v_time_in_venue_daily (user_id, day);

-- 4. explicit permissions – mat-views cannot enforce RLS
REVOKE  ALL    ON public.v_time_in_venue_daily FROM PUBLIC, anon;
GRANT   SELECT ON public.v_time_in_venue_daily TO authenticated;

-- 5. immediate plain refresh (safe on first-run databases)
REFRESH MATERIALIZED VIEW public.v_time_in_venue_daily;

-----------------------------------------------------------------
-- (Optional) weekly concurrent refresh – uncomment when desired
-----------------------------------------------------------------
-- SELECT cron.schedule(
--   'refresh_time_in_venue',
--   '15 2 * * 1',   -- 02:15 UTC every Monday
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_time_in_venue_daily;'
-- );

/* ──────────────────────────────────────────────────────────
   A-03  Helper RPC for yearly stats – NEW
   ──────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.get_yearly_stats(
  uid uuid, yyyy int)
RETURNS TABLE (
  year           int,
  total_venues   int,
  total_minutes  numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    yyyy                               AS year,
    COUNT(DISTINCT venue_id)::int      AS total_venues,
    COALESCE(
      SUM(EXTRACT(EPOCH FROM departed_at - arrived_at))/60, 0
    )                                  AS total_minutes
  FROM public.venue_stays
  WHERE user_id    = uid
    AND arrived_at >= make_date(yyyy,1,1)
    AND arrived_at <  make_date(yyyy+1,1,1)
    AND departed_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_yearly_stats TO authenticated;

/* ──────────────────────────────────────────────────────────
   Private storage bucket for recap PDFs – NEW
   ──────────────────────────────────────────────────────────*/
INSERT INTO storage.buckets (id, name, public)
VALUES ('recaps', 'recaps', false)
ON CONFLICT (id) DO NOTHING;

/* allow each user to CRUD only their own recap file */
CREATE POLICY "recap_read"
  ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recaps'
    AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "recap_upload"
  ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recaps'
    AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "recap_update"
  ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'recaps'
    AND auth.uid()::text = (storage.foldername(name))[1]);