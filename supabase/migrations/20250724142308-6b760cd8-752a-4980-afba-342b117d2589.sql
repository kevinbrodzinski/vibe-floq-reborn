/* =============================================================
   A-01  update_venue_popularity()  + nightly cron
   ============================================================= */
CREATE OR REPLACE FUNCTION public.update_venue_popularity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  /* simple popularity = unique visitors last 30 d */
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

-- idempotent cron (02:10 UTC daily)
SELECT cron.schedule(
  'venue_popularity_nightly',
  '10 2 * * *',
  $$SELECT public.update_venue_popularity();$$
) ON CONFLICT (jobname) DO NOTHING;

/* =============================================================
   A-02  mat-view: v_time_in_venue_daily
   ============================================================= */
DROP MATERIALIZED VIEW IF EXISTS public.v_time_in_venue_daily;
CREATE MATERIALIZED VIEW public.v_time_in_venue_daily AS
SELECT
  user_id,
  day_key                            AS day,
  SUM(EXTRACT(EPOCH FROM departed_at - arrived_at)) / 60
                                     AS minutes_spent
FROM (
  /* compute duration; zero-fill rows that have no departed_at yet */
  SELECT user_id,
         venue_id,
         arrived_at,
         COALESCE(departed_at, arrived_at) AS departed_at,
         day_key
  FROM   public.venue_stays
  WHERE  arrived_at >= now() - INTERVAL '90 days'
) t
GROUP BY user_id, day_key;

CREATE UNIQUE INDEX idx_mv_time_in_venue_daily_uid_day
    ON public.v_time_in_venue_daily (user_id, day);

-- Enable RLS and set permissions
ALTER MATERIALIZED VIEW public.v_time_in_venue_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own time data" ON public.v_time_in_venue_daily
  FOR SELECT USING (user_id = auth.uid());

REVOKE  ALL  ON public.v_time_in_venue_daily FROM public, anon;
GRANT  SELECT ON public.v_time_in_venue_daily TO authenticated;

-- Hourly refresh
SELECT cron.schedule(
  'refresh_time_in_venue_mv',
  '0 * * * *',
  $$ REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_time_in_venue_daily; $$
) ON CONFLICT (jobname) DO NOTHING;

/* =============================================================
   A-03  Helper RPC for yearly stats
   ============================================================= */
CREATE OR REPLACE FUNCTION public.get_yearly_stats(uid uuid, yyyy int)
RETURNS TABLE(
  year int,
  total_venues int,
  total_minutes numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    yyyy                           AS year,
    COUNT(DISTINCT venue_id)::int  AS total_venues,
    COALESCE(SUM(EXTRACT(EPOCH FROM departed_at-arrived_at))/60, 0) AS total_minutes
  FROM   public.venue_stays
  WHERE  user_id = uid
    AND  arrived_at >= make_date(yyyy,1,1)
    AND  arrived_at <  make_date(yyyy+1,1,1)
    AND  departed_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_yearly_stats TO authenticated;

-- Create storage bucket for recaps
INSERT INTO storage.buckets (id, name, public) VALUES ('recaps', 'recaps', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recap files
CREATE POLICY "Users can view their own recaps" ON storage.objects
  FOR SELECT USING (bucket_id = 'recaps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own recaps" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recaps' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own recaps" ON storage.objects
  FOR UPDATE USING (bucket_id = 'recaps' AND auth.uid()::text = (storage.foldername(name))[1]);