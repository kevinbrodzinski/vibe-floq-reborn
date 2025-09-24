BEGIN;
SET LOCAL lock_timeout = '4s';

BEGIN;
SET LOCAL lock_timeout = '4s';

-- Function 31: public.get_afterglow_monthly_trends
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_monthly_trends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_monthly_trends(p_profile_id uuid DEFAULT auth.uid(), p_months_back integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'user not authenticated');
  END IF;

  /* Core stats per calendar month -------------------------------------- */
  WITH month_core AS (
    SELECT
      date_trunc('month', da."date")::date                            AS month_start,
      AVG(da.energy_score)                                            AS avg_energy,
      AVG(da.social_intensity)                                        AS avg_social,
      SUM(da.total_venues + da.total_floqs)                           AS total_activities,
      mode() WITHIN GROUP (ORDER BY da.dominant_vibe)                 AS dominant_vibe
    FROM public.daily_afterglow da
    WHERE   da.profile_id = p_profile_id
        AND da."date" >= date_trunc('month', CURRENT_DATE)
                       - (p_months_back * INTERVAL '1 month')
    GROUP BY date_trunc('month', da."date")
  ),

  /* Peak-energy day per month ----------------------------------------- */
  month_peaks AS (
    SELECT DISTINCT ON (date_trunc('month', da."date"))
           date_trunc('month', da."date")::date  AS month_start,
           da."date"                             AS peak_day
    FROM   public.daily_afterglow da
    WHERE  da.profile_id = p_profile_id
      AND  da."date" >= date_trunc('month', CURRENT_DATE)
                      - (p_months_back * INTERVAL '1 month')
    ORDER  BY date_trunc('month', da."date"), da.energy_score DESC NULLS LAST
  )

  /* Build JSON -------------------------------------------------------- */
  SELECT jsonb_agg(
           jsonb_build_object(
             'month',              TO_CHAR(mc.month_start, 'YYYY-MM'),
             'avg_energy_score',   ROUND(mc.avg_energy, 2),
             'avg_social_intensity', ROUND(mc.avg_social, 2),
             'total_activities',   mc.total_activities,
             'dominant_vibe',      mc.dominant_vibe,
             'peak_activity_day',  mp.peak_day
           ) ORDER BY mc.month_start
         )
    INTO result
  FROM month_core mc
  LEFT JOIN month_peaks mp USING (month_start);

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$"
"-- Function 118: public.get_afterglow_monthly_trends
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_monthly_trends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_monthly_trends(p_profile_id uuid DEFAULT auth.uid(), p_months_back integer DEFAULT 6)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'user not authenticated');
  END IF;

  /* Core stats per calendar month -------------------------------------- */
  WITH month_core AS (
    SELECT
      date_trunc('month', da."date")::date                            AS month_start,
      AVG(da.energy_score)                                            AS avg_energy,
      AVG(da.social_intensity)                                        AS avg_social,
      SUM(da.total_venues + da.total_floqs)                           AS total_activities,
      mode() WITHIN GROUP (ORDER BY da.dominant_vibe)                 AS dominant_vibe
    FROM public.daily_afterglow da
    WHERE   da.profile_id = p_profile_id
        AND da."date" >= date_trunc('month', CURRENT_DATE)
                       - (p_months_back * INTERVAL '1 month')
    GROUP BY date_trunc('month', da."date")
  ),

  /* Peak-energy day per month ----------------------------------------- */
  month_peaks AS (
    SELECT DISTINCT ON (date_trunc('month', da."date"))
           date_trunc('month', da."date")::date  AS month_start,
           da."date"                             AS peak_day
    FROM   public.daily_afterglow da
    WHERE  da.profile_id = p_profile_id
      AND  da."date" >= date_trunc('month', CURRENT_DATE)
                      - (p_months_back * INTERVAL '1 month')
    ORDER  BY date_trunc('month', da."date"), da.energy_score DESC NULLS LAST
  )

  /* Build JSON -------------------------------------------------------- */
  SELECT jsonb_agg(
           jsonb_build_object(
             'month',              TO_CHAR(mc.month_start, 'YYYY-MM'),
             'avg_energy_score',   ROUND(mc.avg_energy, 2),
             'avg_social_intensity', ROUND(mc.avg_social, 2),
             'total_activities',   mc.total_activities,
             'dominant_vibe',      mc.dominant_vibe,
             'peak_activity_day',  mp.peak_day
           ) ORDER BY mc.month_start
         )
    INTO result
  FROM month_core mc
  LEFT JOIN month_peaks mp USING (month_start);

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$"
"-- Function 119: public.get_afterglow_weekly_patterns
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_weekly_patterns CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_weekly_patterns(p_profile_id uuid DEFAULT auth.uid(), p_weeks_back integer DEFAULT 4)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'user not authenticated');
  END IF;

  WITH weekly_data AS (
    SELECT
      EXTRACT(DOW FROM da."date")::int                                           AS dow,
      AVG(da.energy_score)                                                      AS avg_energy,
      AVG(da.social_intensity)                                                  AS avg_social,
      ROUND(AVG(da.total_venues))::int                                          AS avg_venues,
      ROUND(AVG(da.total_floqs))::int                                           AS avg_floqs,
      COUNT(*)                                                                  AS sample_size
    FROM public.daily_afterglow da
    WHERE   da.profile_id = p_profile_id
        AND da."date" >= CURRENT_DATE - (p_weeks_back * INTERVAL '1 week')
    GROUP BY EXTRACT(DOW FROM da."date")
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'day_of_week',       wd.dow,
             'day_name',          CASE wd.dow
                                    WHEN 0 THEN 'Sunday'
                                    WHEN 1 THEN 'Monday'
                                    WHEN 2 THEN 'Tuesday'
                                    WHEN 3 THEN 'Wednesday'
                                    WHEN 4 THEN 'Thursday'
                                    WHEN 5 THEN 'Friday'
                                    WHEN 6 THEN 'Saturday'
                                  END,
             'avg_energy_score',  ROUND(wd.avg_energy, 2),
             'avg_social_intensity', ROUND(wd.avg_social, 2),
             'avg_venues',        wd.avg_venues,
             'avg_floqs',         wd.avg_floqs,
             'sample_size',       wd.sample_size
           )
         )
    INTO result
  FROM weekly_data wd;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$"
"-- Function 32: public.get_afterglow_weekly_patterns
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_weekly_patterns CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_weekly_patterns(p_profile_id uuid DEFAULT auth.uid(), p_weeks_back integer DEFAULT 4)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'user not authenticated');
  END IF;

  WITH weekly_data AS (
    SELECT
      EXTRACT(DOW FROM da."date")::int                                           AS dow,
      AVG(da.energy_score)                                                      AS avg_energy,
      AVG(da.social_intensity)                                                  AS avg_social,
      ROUND(AVG(da.total_venues))::int                                          AS avg_venues,
      ROUND(AVG(da.total_floqs))::int                                           AS avg_floqs,
      COUNT(*)                                                                  AS sample_size
    FROM public.daily_afterglow da
    WHERE   da.profile_id = p_profile_id
        AND da."date" >= CURRENT_DATE - (p_weeks_back * INTERVAL '1 week')
    GROUP BY EXTRACT(DOW FROM da."date")
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'day_of_week',       wd.dow,
             'day_name',          CASE wd.dow
                                    WHEN 0 THEN 'Sunday'
                                    WHEN 1 THEN 'Monday'
                                    WHEN 2 THEN 'Tuesday'
                                    WHEN 3 THEN 'Wednesday'
                                    WHEN 4 THEN 'Thursday'
                                    WHEN 5 THEN 'Friday'
                                    WHEN 6 THEN 'Saturday'
                                  END,
             'avg_energy_score',  ROUND(wd.avg_energy, 2),
             'avg_social_intensity', ROUND(wd.avg_social, 2),
             'avg_venues',        wd.avg_venues,
             'avg_floqs',         wd.avg_floqs,
             'sample_size',       wd.sample_size
           )
         )
    INTO result
  FROM weekly_data wd;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$"
"-- Function 120: public.get_afterglow_weekly_trends
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_weekly_trends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_weekly_trends(p_profile_id uuid DEFAULT auth.uid())
 RETURNS TABLE(week_start date, avg_energy numeric, avg_social numeric, day_count integer, energy_trend text, social_trend text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH weekly_stats AS (
    SELECT
      date_trunc('week', da.date)::date               AS week_start,
      AVG(da.energy_score)::numeric(10,2)             AS avg_energy,
      AVG(da.social_intensity)::numeric(10,2)         AS avg_social,
      COUNT(*)                                        AS day_count
    FROM  daily_afterglow da
    WHERE da.profile_id = p_profile_id
      AND da.date >= CURRENT_DATE - INTERVAL '8 weeks'
    GROUP BY 1
  ),
  trend_analysis AS (
    SELECT
      ws.*,
      LAG(ws.avg_energy) OVER (ORDER BY ws.week_start)  AS prev_energy,
      LAG(ws.avg_social) OVER (ORDER BY ws.week_start)  AS prev_social
    FROM weekly_stats ws
  )
  SELECT
    ta.week_start,
    ta.avg_energy,
    ta.avg_social,
    ta.day_count,
    CASE
      WHEN ta.prev_energy IS NULL                     THEN 'stable'
      WHEN ta.avg_energy  >= ta.prev_energy + 5       THEN 'improving'
      WHEN ta.avg_energy  <= ta.prev_energy - 5       THEN 'declining'
      ELSE 'stable'
    END                                               AS energy_trend,
    CASE
      WHEN ta.prev_social IS NULL                     THEN 'stable'
      WHEN ta.avg_social  >= ta.prev_social + 5       THEN 'improving'
      WHEN ta.avg_social  <= ta.prev_social - 5       THEN 'declining'
      ELSE 'stable'
    END                                               AS social_trend
  FROM trend_analysis ta
  ORDER BY ta.week_start;
END;
$function$"
"-- Function 33: public.get_afterglow_weekly_trends
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_weekly_trends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_weekly_trends(p_profile_id uuid DEFAULT auth.uid())
 RETURNS TABLE(week_start date, avg_energy numeric, avg_social numeric, day_count integer, energy_trend text, social_trend text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH weekly_stats AS (
    SELECT
      date_trunc('week', da.date)::date               AS week_start,
      AVG(da.energy_score)::numeric(10,2)             AS avg_energy,
      AVG(da.social_intensity)::numeric(10,2)         AS avg_social,
      COUNT(*)                                        AS day_count
    FROM  daily_afterglow da
    WHERE da.profile_id = p_profile_id
      AND da.date >= CURRENT_DATE - INTERVAL '8 weeks'
    GROUP BY 1
  ),
  trend_analysis AS (
    SELECT
      ws.*,
      LAG(ws.avg_energy) OVER (ORDER BY ws.week_start)  AS prev_energy,
      LAG(ws.avg_social) OVER (ORDER BY ws.week_start)  AS prev_social
    FROM weekly_stats ws
  )
  SELECT
    ta.week_start,
    ta.avg_energy,
    ta.avg_social,
    ta.day_count,
    CASE
      WHEN ta.prev_energy IS NULL                     THEN 'stable'
      WHEN ta.avg_energy  >= ta.prev_energy + 5       THEN 'improving'
      WHEN ta.avg_energy  <= ta.prev_energy - 5       THEN 'declining'
      ELSE 'stable'
    END                                               AS energy_trend,
    CASE
      WHEN ta.prev_social IS NULL                     THEN 'stable'
      WHEN ta.avg_social  >= ta.prev_social + 5       THEN 'improving'
      WHEN ta.avg_social  <= ta.prev_social - 5       THEN 'declining'
      ELSE 'stable'
    END                                               AS social_trend
  FROM trend_analysis ta
  ORDER BY ta.week_start;
END;
$function$"
"-- Function 34: public.get_afterglow_with_moments
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_with_moments CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_with_moments(p_afterglow_id uuid, p_profile_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  if p_profile_id is null then
    return jsonb_build_object('error','user not authenticated');
  end if;

  select jsonb_build_object(
    'afterglow', to_jsonb(da.*)            - 'moments',   -- all columns except the jsonb "moments"
    'moments',   jsonb_agg(am.* order by am.timestamp)
  )
  into r
  from daily_afterglow      da
  left join afterglow_moments am
    on am.daily_afterglow_id = da.id
  where da.id      = p_afterglow_id
    and da.profile_id = p_profile_id
  group by da.id;

  return coalesce(r, jsonb_build_object('error','not found'));
end;
$function$"
"-- Function 121: public.get_afterglow_with_moments
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_afterglow_with_moments CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_afterglow_with_moments(p_afterglow_id uuid, p_profile_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  if p_profile_id is null then
    return jsonb_build_object('error','user not authenticated');
  end if;

  select jsonb_build_object(
    'afterglow', to_jsonb(da.*)            - 'moments',   -- all columns except the jsonb "moments"
    'moments',   jsonb_agg(am.* order by am.timestamp)
  )
  into r
  from daily_afterglow      da
  left join afterglow_moments am
    on am.daily_afterglow_id = da.id
  where da.id      = p_afterglow_id
    and da.profile_id = p_profile_id
  group by da.id;

  return coalesce(r, jsonb_build_object('error','not found'));
end;
$function$"
"-- Function 122: public.get_archive_stats
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_archive_stats CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_archive_stats(p_profile_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('error','user not authenticated');
  END IF;

  WITH agg AS (
    SELECT
      count(*)                                         AS total_days,
      count(*) FILTER (WHERE is_pinned)               AS pinned_days,
      count(*) FILTER (WHERE energy_score >= 80)      AS high_energy_days,
      count(*) FILTER (WHERE social_intensity >= 80)  AS high_social_days,
      count(*) FILTER (WHERE total_venues+total_floqs>0) AS active_days,
      avg(energy_score)                               AS avg_energy,
      avg(social_intensity)                           AS avg_social,
      sum(total_venues)                               AS total_venues,
      sum(total_floqs)                                AS total_floqs,
      sum(crossed_paths_count)                        AS total_paths_crossed,
      min(date)                                       AS first_entry,
      max(date)                                       AS latest_entry,
      mode() WITHIN GROUP (ORDER BY dominant_vibe)    AS most_common_vibe
    FROM daily_afterglow
    WHERE profile_id = p_profile_id
  ),
  moments AS (
    SELECT
      count(*)                                         AS total_moments,
      count(DISTINCT moment_type)                      AS unique_moment_types,
      mode() WITHIN GROUP (ORDER BY moment_type)       AS most_common_moment_type
    FROM afterglow_moments am
    JOIN daily_afterglow da ON da.id = am.daily_afterglow_id
    WHERE da.profile_id = p_profile_id
  ),
  recent AS (
    SELECT
      count(*)                                         AS days_last_30,
      avg(energy_score)                                AS avg_energy_30,
      avg(social_intensity)                            AS avg_social_30
    FROM daily_afterglow
    WHERE profile_id = p_profile_id
      AND date >= current_date - interval '30 days'
  ),
  vibes AS (
    SELECT jsonb_object_agg(dominant_vibe, cnt) AS vibe_counts
    FROM (
      SELECT dominant_vibe, count(*) cnt
      FROM daily_afterglow
      WHERE profile_id = p_profile_id
        AND dominant_vibe IS NOT NULL
      GROUP BY dominant_vibe
    ) x
  )
  SELECT jsonb_build_object(
           'overview', jsonb_build_object(
             'total_days',           agg.total_days,
             'pinned_days',          agg.pinned_days,
             'active_days',          agg.active_days,
             'first_entry',          agg.first_entry,
             'latest_entry',         agg.latest_entry,
             'total_moments',        moments.total_moments
           ),
           'energy_insights', jsonb_build_object(
             'avg_energy_all_time',  round(coalesce(agg.avg_energy,0),2),
             'avg_energy_last_30',   round(coalesce(recent.avg_energy_30,0),2),
             'high_energy_days',     agg.high_energy_days,
             'energy_trend', CASE
                               WHEN recent.avg_energy_30 > agg.avg_energy * 1.1 THEN 'improving'
                               WHEN recent.avg_energy_30 < agg.avg_energy * 0.9 THEN 'declining'
                               ELSE 'stable'
                             END
           ),
           'social_insights', jsonb_build_object(
             'avg_social_all_time',  round(coalesce(agg.avg_social,0),2),
             'avg_social_last_30',   round(coalesce(recent.avg_social_30,0),2),
             'high_social_days',     agg.high_social_days,
             'social_trend', CASE
                               WHEN recent.avg_social_30 > agg.avg_social * 1.1 THEN 'improving'
                               WHEN recent.avg_social_30 < agg.avg_social * 0.9 THEN 'declining'
                               ELSE 'stable'
                             END
           ),
           'activity_summary', jsonb_build_object(
             'total_venues_visited', agg.total_venues,
             'total_floqs_joined',   agg.total_floqs,
             'total_paths_crossed',  agg.total_paths_crossed,
             'most_common_vibe',     agg.most_common_vibe,
             'vibe_distribution',    vibes.vibe_counts
           ),
           'moments_insights', jsonb_build_object(
             'total_moments',        moments.total_moments,
             'unique_moment_types',  moments.unique_moment_types,
             'most_common_moment_type', moments.most_common_moment_type,
             'avg_moments_per_day',  CASE WHEN agg.total_days>0
                                          THEN round(moments.total_moments::numeric/agg.total_days,2)
                                          ELSE 0 END
           ),
           'recent_activity', jsonb_build_object(
             'days_logged_last_30',  recent.days_last_30,
             'activity_rate_last_30', CASE
                                        WHEN recent.days_last_30 > 20 THEN 'high'
                                        WHEN recent.days_last_30 > 10 THEN 'medium'
                                        ELSE 'low'
                                      END
           )
         ) INTO result
  FROM agg, moments, recent, vibes;

  RETURN result;
END;
$function$"
"-- Function 35: public.get_archive_stats
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_archive_stats CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_archive_stats(p_profile_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN jsonb_build_object('error','user not authenticated');
  END IF;

  WITH agg AS (
    SELECT
      count(*)                                         AS total_days,
      count(*) FILTER (WHERE is_pinned)               AS pinned_days,
      count(*) FILTER (WHERE energy_score >= 80)      AS high_energy_days,
      count(*) FILTER (WHERE social_intensity >= 80)  AS high_social_days,
      count(*) FILTER (WHERE total_venues+total_floqs>0) AS active_days,
      avg(energy_score)                               AS avg_energy,
      avg(social_intensity)                           AS avg_social,
      sum(total_venues)                               AS total_venues,
      sum(total_floqs)                                AS total_floqs,
      sum(crossed_paths_count)                        AS total_paths_crossed,
      min(date)                                       AS first_entry,
      max(date)                                       AS latest_entry,
      mode() WITHIN GROUP (ORDER BY dominant_vibe)    AS most_common_vibe
    FROM daily_afterglow
    WHERE profile_id = p_profile_id
  ),
  moments AS (
    SELECT
      count(*)                                         AS total_moments,
      count(DISTINCT moment_type)                      AS unique_moment_types,
      mode() WITHIN GROUP (ORDER BY moment_type)       AS most_common_moment_type
    FROM afterglow_moments am
    JOIN daily_afterglow da ON da.id = am.daily_afterglow_id
    WHERE da.profile_id = p_profile_id
  ),
  recent AS (
    SELECT
      count(*)                                         AS days_last_30,
      avg(energy_score)                                AS avg_energy_30,
      avg(social_intensity)                            AS avg_social_30
    FROM daily_afterglow
    WHERE profile_id = p_profile_id
      AND date >= current_date - interval '30 days'
  ),
  vibes AS (
    SELECT jsonb_object_agg(dominant_vibe, cnt) AS vibe_counts
    FROM (
      SELECT dominant_vibe, count(*) cnt
      FROM daily_afterglow
      WHERE profile_id = p_profile_id
        AND dominant_vibe IS NOT NULL
      GROUP BY dominant_vibe
    ) x
  )
  SELECT jsonb_build_object(
           'overview', jsonb_build_object(
             'total_days',           agg.total_days,
             'pinned_days',          agg.pinned_days,
             'active_days',          agg.active_days,
             'first_entry',          agg.first_entry,
             'latest_entry',         agg.latest_entry,
             'total_moments',        moments.total_moments
           ),
           'energy_insights', jsonb_build_object(
             'avg_energy_all_time',  round(coalesce(agg.avg_energy,0),2),
             'avg_energy_last_30',   round(coalesce(recent.avg_energy_30,0),2),
             'high_energy_days',     agg.high_energy_days,
             'energy_trend', CASE
                               WHEN recent.avg_energy_30 > agg.avg_energy * 1.1 THEN 'improving'
                               WHEN recent.avg_energy_30 < agg.avg_energy * 0.9 THEN 'declining'
                               ELSE 'stable'
                             END
           ),
           'social_insights', jsonb_build_object(
             'avg_social_all_time',  round(coalesce(agg.avg_social,0),2),
             'avg_social_last_30',   round(coalesce(recent.avg_social_30,0),2),
             'high_social_days',     agg.high_social_days,
             'social_trend', CASE
                               WHEN recent.avg_social_30 > agg.avg_social * 1.1 THEN 'improving'
                               WHEN recent.avg_social_30 < agg.avg_social * 0.9 THEN 'declining'
                               ELSE 'stable'
                             END
           ),
           'activity_summary', jsonb_build_object(
             'total_venues_visited', agg.total_venues,
             'total_floqs_joined',   agg.total_floqs,
             'total_paths_crossed',  agg.total_paths_crossed,
             'most_common_vibe',     agg.most_common_vibe,
             'vibe_distribution',    vibes.vibe_counts
           ),
           'moments_insights', jsonb_build_object(
             'total_moments',        moments.total_moments,
             'unique_moment_types',  moments.unique_moment_types,
             'most_common_moment_type', moments.most_common_moment_type,
             'avg_moments_per_day',  CASE WHEN agg.total_days>0
                                          THEN round(moments.total_moments::numeric/agg.total_days,2)
                                          ELSE 0 END
           ),
           'recent_activity', jsonb_build_object(
             'days_logged_last_30',  recent.days_last_30,
             'activity_rate_last_30', CASE
                                        WHEN recent.days_last_30 > 20 THEN 'high'
                                        WHEN recent.days_last_30 > 10 THEN 'medium'
                                        ELSE 'low'
                                      END
           )
         ) INTO result
  FROM agg, moments, recent, vibes;

  RETURN result;
END;
$function$"
"-- Function 36: public.get_dashboard_checkins
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_checkins CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_checkins(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH checkin_stats AS (
    SELECT 
      COUNT(*) as total_checkins,
      COUNT(DISTINCT profile_id) as unique_users,
      COUNT(DISTINCT venue_id) as unique_venues,
      COUNT(*) FILTER (WHERE last_heartbeat >= start_date) as recent_checkins,
      COALESCE(AVG(EXTRACT(EPOCH FROM (expires_at - last_heartbeat))/60), 0) as avg_session_minutes
    FROM venue_live_presence
    WHERE last_heartbeat >= start_date
  ),
  daily_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'date', TO_CHAR(day_series, 'Mon DD'),
          'checkins', COALESCE(daily_counts.count, 0),
          'unique_users', COALESCE(daily_counts.users, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(last_heartbeat) as day,
        COUNT(*) as count,
        COUNT(DISTINCT profile_id) as users
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY DATE(last_heartbeat)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  hourly_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'hour', hour_val,
          'checkins', COALESCE(hourly_counts.count, 0)
        ) ORDER BY hour_val
      ) as hourly_data
    FROM generate_series(0, 23) as hour_val
    LEFT JOIN (
      SELECT 
        EXTRACT(HOUR FROM last_heartbeat) as hour,
        COUNT(*) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY EXTRACT(HOUR FROM last_heartbeat)
    ) hourly_counts ON hour_val = hourly_counts.hour
  ),
  popular_venues AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'venue_id', venue_id,
          'checkins', count,
          'unique_users', users
        ) ORDER BY count DESC
      ) as venues_data
    FROM (
      SELECT 
        venue_id,
        COUNT(*) as count,
        COUNT(DISTINCT profile_id) as users
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY venue_id
      ORDER BY count DESC
      LIMIT 10
    ) venue_stats
  ),
  vibe_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe::text,
          'checkins', count
        ) ORDER BY count DESC
      ) as vibe_data
    FROM (
      SELECT 
        vibe,
        COUNT(*) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
        AND vibe IS NOT NULL
      GROUP BY vibe
    ) vibe_counts
  ),
  current_presence AS (
    SELECT 
      COUNT(*) as currently_present,
      jsonb_agg(
        jsonb_build_object(
          'venue_id', venue_id,
          'vibe', vibe::text,
          'duration_minutes', ROUND(EXTRACT(EPOCH FROM (now() - last_heartbeat))/60)
        )
      ) as presence_data
    FROM venue_live_presence 
    WHERE expires_at > now()
  )
  SELECT jsonb_build_object(
    'total_checkins', cs.total_checkins,
    'unique_users', cs.unique_users,
    'unique_venues', cs.unique_venues,
    'recent_checkins', cs.recent_checkins,
    'avg_session_minutes', ROUND(cs.avg_session_minutes::numeric, 1),
    'currently_present', COALESCE(cp.currently_present, 0),
    'daily_checkins', COALESCE(dc.daily_data, '[]'::jsonb),
    'hourly_checkins', COALESCE(hc.hourly_data, '[]'::jsonb),
    'popular_venues', COALESCE(pv.venues_data, '[]'::jsonb),
    'vibe_checkins', COALESCE(vc.vibe_data, '[]'::jsonb),
    'current_presence', COALESCE(cp.presence_data, '[]'::jsonb)
  ) INTO result
  FROM checkin_stats cs, daily_checkins dc, hourly_checkins hc,
       popular_venues pv, vibe_checkins vc, current_presence cp;
  
  RETURN result;
END;
$function$"
"-- Function 125: public.get_dashboard_checkins
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_checkins CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_checkins(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH checkin_stats AS (
    SELECT 
      COUNT(*) as total_checkins,
      COUNT(DISTINCT profile_id) as unique_users,
      COUNT(DISTINCT venue_id) as unique_venues,
      COUNT(*) FILTER (WHERE last_heartbeat >= start_date) as recent_checkins,
      COALESCE(AVG(EXTRACT(EPOCH FROM (expires_at - last_heartbeat))/60), 0) as avg_session_minutes
    FROM venue_live_presence
    WHERE last_heartbeat >= start_date
  ),
  daily_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'date', TO_CHAR(day_series, 'Mon DD'),
          'checkins', COALESCE(daily_counts.count, 0),
          'unique_users', COALESCE(daily_counts.users, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(last_heartbeat) as day,
        COUNT(*) as count,
        COUNT(DISTINCT profile_id) as users
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY DATE(last_heartbeat)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  hourly_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'hour', hour_val,
          'checkins', COALESCE(hourly_counts.count, 0)
        ) ORDER BY hour_val
      ) as hourly_data
    FROM generate_series(0, 23) as hour_val
    LEFT JOIN (
      SELECT 
        EXTRACT(HOUR FROM last_heartbeat) as hour,
        COUNT(*) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY EXTRACT(HOUR FROM last_heartbeat)
    ) hourly_counts ON hour_val = hourly_counts.hour
  ),
  popular_venues AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'venue_id', venue_id,
          'checkins', count,
          'unique_users', users
        ) ORDER BY count DESC
      ) as venues_data
    FROM (
      SELECT 
        venue_id,
        COUNT(*) as count,
        COUNT(DISTINCT profile_id) as users
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY venue_id
      ORDER BY count DESC
      LIMIT 10
    ) venue_stats
  ),
  vibe_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe::text,
          'checkins', count
        ) ORDER BY count DESC
      ) as vibe_data
    FROM (
      SELECT 
        vibe,
        COUNT(*) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
        AND vibe IS NOT NULL
      GROUP BY vibe
    ) vibe_counts
  ),
  current_presence AS (
    SELECT 
      COUNT(*) as currently_present,
      jsonb_agg(
        jsonb_build_object(
          'venue_id', venue_id,
          'vibe', vibe::text,
          'duration_minutes', ROUND(EXTRACT(EPOCH FROM (now() - last_heartbeat))/60)
        )
      ) as presence_data
    FROM venue_live_presence 
    WHERE expires_at > now()
  )
  SELECT jsonb_build_object(
    'total_checkins', cs.total_checkins,
    'unique_users', cs.unique_users,
    'unique_venues', cs.unique_venues,
    'recent_checkins', cs.recent_checkins,
    'avg_session_minutes', ROUND(cs.avg_session_minutes::numeric, 1),
    'currently_present', COALESCE(cp.currently_present, 0),
    'daily_checkins', COALESCE(dc.daily_data, '[]'::jsonb),
    'hourly_checkins', COALESCE(hc.hourly_data, '[]'::jsonb),
    'popular_venues', COALESCE(pv.venues_data, '[]'::jsonb),
    'vibe_checkins', COALESCE(vc.vibe_data, '[]'::jsonb),
    'current_presence', COALESCE(cp.presence_data, '[]'::jsonb)
  ) INTO result
  FROM checkin_stats cs, daily_checkins dc, hourly_checkins hc,
       popular_venues pv, vibe_checkins vc, current_presence cp;
  
  RETURN result;
END;
$function$"
"-- Function 126: public.get_dashboard_overview
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_overview CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= start_date) as recent_users
    FROM auth.users
  ),
  floq_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE ends_at > now() AND deleted_at IS NULL) as active_floqs,
      COUNT(*) FILTER (WHERE created_at >= start_date AND deleted_at IS NULL) as recent_floqs
    FROM floqs
  ),
  plan_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at >= start_date) as recent_plans
    FROM floq_plans
  ),
  checkin_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE last_heartbeat >= start_date) as recent_checkins
    FROM venue_live_presence
  ),
  ai_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE ai_summary_generated_at >= start_date) as ai_summaries
    FROM daily_afterglow
    WHERE ai_summary IS NOT NULL
  ),
  message_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at >= start_date) as messages_sent
    FROM floq_messages
  ),
  session_stats AS (
    SELECT 
      COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(expires_at, now()) - last_heartbeat))/60), 0) as avg_session_minutes
    FROM venue_live_presence 
    WHERE last_heartbeat >= start_date
  ),
  daily_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'YYYY-MM-DD'),
          'count', COALESCE(daily_counts.count, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(last_heartbeat) as day,
        COUNT(DISTINCT profile_id) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY DATE(last_heartbeat)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  plan_trends AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'YYYY-MM-DD'),
          'count', COALESCE(daily_plans.count, 0)
        ) ORDER BY day_series
      ) as plan_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as count
      FROM floq_plans 
      WHERE created_at >= start_date
      GROUP BY DATE(created_at)
    ) daily_plans ON day_series::date = daily_plans.day
  )
  SELECT jsonb_build_object(
    'total_users', us.total_users,
    'recent_users', us.recent_users,
    'active_floqs', fs.active_floqs,
    'recent_floqs', fs.recent_floqs,
    'recent_plans', ps.recent_plans,
    'recent_checkins', cs.recent_checkins,
    'ai_summaries', ais.ai_summaries,
    'messages_sent', ms.messages_sent,
    'average_session_time', ROUND(ss.avg_session_minutes::numeric, 1),
    'daily_checkins', dc.daily_data,
    'plan_creation_trend', pt.plan_data
  ) INTO result
  FROM user_stats us, floq_stats fs, plan_stats ps, checkin_stats cs, 
       ai_stats ais, message_stats ms, session_stats ss, daily_checkins dc, plan_trends pt;
  
  RETURN result;
END;
$function$"
"-- Function 37: public.get_dashboard_overview
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_overview CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_overview(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= start_date) as recent_users
    FROM auth.users
  ),
  floq_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE ends_at > now() AND deleted_at IS NULL) as active_floqs,
      COUNT(*) FILTER (WHERE created_at >= start_date AND deleted_at IS NULL) as recent_floqs
    FROM floqs
  ),
  plan_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at >= start_date) as recent_plans
    FROM floq_plans
  ),
  checkin_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE last_heartbeat >= start_date) as recent_checkins
    FROM venue_live_presence
  ),
  ai_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE ai_summary_generated_at >= start_date) as ai_summaries
    FROM daily_afterglow
    WHERE ai_summary IS NOT NULL
  ),
  message_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE created_at >= start_date) as messages_sent
    FROM floq_messages
  ),
  session_stats AS (
    SELECT 
      COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(expires_at, now()) - last_heartbeat))/60), 0) as avg_session_minutes
    FROM venue_live_presence 
    WHERE last_heartbeat >= start_date
  ),
  daily_checkins AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'YYYY-MM-DD'),
          'count', COALESCE(daily_counts.count, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(last_heartbeat) as day,
        COUNT(DISTINCT profile_id) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY DATE(last_heartbeat)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  plan_trends AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'YYYY-MM-DD'),
          'count', COALESCE(daily_plans.count, 0)
        ) ORDER BY day_series
      ) as plan_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as count
      FROM floq_plans 
      WHERE created_at >= start_date
      GROUP BY DATE(created_at)
    ) daily_plans ON day_series::date = daily_plans.day
  )
  SELECT jsonb_build_object(
    'total_users', us.total_users,
    'recent_users', us.recent_users,
    'active_floqs', fs.active_floqs,
    'recent_floqs', fs.recent_floqs,
    'recent_plans', ps.recent_plans,
    'recent_checkins', cs.recent_checkins,
    'ai_summaries', ais.ai_summaries,
    'messages_sent', ms.messages_sent,
    'average_session_time', ROUND(ss.avg_session_minutes::numeric, 1),
    'daily_checkins', dc.daily_data,
    'plan_creation_trend', pt.plan_data
  ) INTO result
  FROM user_stats us, floq_stats fs, plan_stats ps, checkin_stats cs, 
       ai_stats ais, message_stats ms, session_stats ss, daily_checkins dc, plan_trends pt;
  
  RETURN result;
END;
$function$"
"-- Function 38: public.get_dashboard_plans
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_plans CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_plans(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH plan_stats AS (
    SELECT 
      COUNT(*) as total_plans,
      COUNT(*) FILTER (WHERE status = 'active') as active_plans,
      COUNT(*) FILTER (WHERE created_at >= start_date) as recent_plans
    FROM floq_plans
  ),
  participant_stats AS (
    SELECT 
      COALESCE(AVG(participant_count), 0) as avg_participants
    FROM (
      SELECT fp.id, COUNT(pp.profile_id) as participant_count
      FROM floq_plans fp
      LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
      WHERE fp.created_at >= start_date
      GROUP BY fp.id
    ) plan_participant_counts
  ),
  completion_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100), 1)
        ELSE 0
      END as completion_rate
    FROM floq_plans
    WHERE created_at >= start_date
  ),
  daily_creations AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'YYYY-MM-DD'),
          'count', COALESCE(daily_counts.count, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as count
      FROM floq_plans 
      WHERE created_at >= start_date
      GROUP BY DATE(created_at)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  popular_plans AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'id', fp.id,
          'title', fp.title,
          'people', participant_count
        ) ORDER BY participant_count DESC
      ) as popular_data
    FROM (
      SELECT fp.id, fp.title, COUNT(pp.profile_id) as participant_count
      FROM floq_plans fp
      LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
      WHERE fp.created_at >= start_date
      GROUP BY fp.id, fp.title
      ORDER BY participant_count DESC
      LIMIT 5
    ) fp
  ),
  plan_categories AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'label', COALESCE(vibe_tag, 'other'),
          'count', count
        ) ORDER BY count DESC
      ) as category_data
    FROM (
      SELECT 
        COALESCE(vibe_tag::text, 'other') as vibe_tag,
        COUNT(*) as count
      FROM floq_plans
      WHERE created_at >= start_date
      GROUP BY vibe_tag
      LIMIT 6
    ) categories
  )
  SELECT jsonb_build_object(
    'total_plans', ps.total_plans,
    'active_plans', ps.active_plans,
    'recent_plans', ps.recent_plans,
    'avg_participants', ROUND(pars.avg_participants, 1),
    'completion_rate', cs.completion_rate,
    'daily_creations', dc.daily_data,
    'popular_plans', COALESCE(pp.popular_data, '[]'::jsonb),
    'plan_categories', COALESCE(pc.category_data, '[]'::jsonb)
  ) INTO result
  FROM plan_stats ps, participant_stats pars, completion_stats cs, 
       daily_creations dc, popular_plans pp, plan_categories pc;
  
  RETURN result;
END;
$function$"
"-- Function 127: public.get_dashboard_plans
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_plans CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_plans(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH plan_stats AS (
    SELECT 
      COUNT(*) as total_plans,
      COUNT(*) FILTER (WHERE status = 'active') as active_plans,
      COUNT(*) FILTER (WHERE created_at >= start_date) as recent_plans
    FROM floq_plans
  ),
  participant_stats AS (
    SELECT 
      COALESCE(AVG(participant_count), 0) as avg_participants
    FROM (
      SELECT fp.id, COUNT(pp.profile_id) as participant_count
      FROM floq_plans fp
      LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
      WHERE fp.created_at >= start_date
      GROUP BY fp.id
    ) plan_participant_counts
  ),
  completion_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100), 1)
        ELSE 0
      END as completion_rate
    FROM floq_plans
    WHERE created_at >= start_date
  ),
  daily_creations AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'YYYY-MM-DD'),
          'count', COALESCE(daily_counts.count, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(created_at) as day,
        COUNT(*) as count
      FROM floq_plans 
      WHERE created_at >= start_date
      GROUP BY DATE(created_at)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  popular_plans AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'id', fp.id,
          'title', fp.title,
          'people', participant_count
        ) ORDER BY participant_count DESC
      ) as popular_data
    FROM (
      SELECT fp.id, fp.title, COUNT(pp.profile_id) as participant_count
      FROM floq_plans fp
      LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
      WHERE fp.created_at >= start_date
      GROUP BY fp.id, fp.title
      ORDER BY participant_count DESC
      LIMIT 5
    ) fp
  ),
  plan_categories AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'label', COALESCE(vibe_tag, 'other'),
          'count', count
        ) ORDER BY count DESC
      ) as category_data
    FROM (
      SELECT 
        COALESCE(vibe_tag::text, 'other') as vibe_tag,
        COUNT(*) as count
      FROM floq_plans
      WHERE created_at >= start_date
      GROUP BY vibe_tag
      LIMIT 6
    ) categories
  )
  SELECT jsonb_build_object(
    'total_plans', ps.total_plans,
    'active_plans', ps.active_plans,
    'recent_plans', ps.recent_plans,
    'avg_participants', ROUND(pars.avg_participants, 1),
    'completion_rate', cs.completion_rate,
    'daily_creations', dc.daily_data,
    'popular_plans', COALESCE(pp.popular_data, '[]'::jsonb),
    'plan_categories', COALESCE(pc.category_data, '[]'::jsonb)
  ) INTO result
  FROM plan_stats ps, participant_stats pars, completion_stats cs, 
       daily_creations dc, popular_plans pp, plan_categories pc;
  
  RETURN result;
END;
$function$"
"-- Function 128: public.get_dashboard_users
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_users CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_users(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= start_date) as weekly_new
    FROM auth.users
  ),
  activity_stats AS (
    SELECT 
      COUNT(DISTINCT profile_id) FILTER (WHERE last_heartbeat >= now() - interval '24 hours') as daily_active,
      COUNT(DISTINCT profile_id) FILTER (WHERE last_heartbeat >= now() - interval '7 days') as weekly_active,
      COALESCE(AVG(EXTRACT(EPOCH FROM (expires_at - last_heartbeat))/60), 0) as avg_session_minutes
    FROM venue_live_presence 
    WHERE last_heartbeat >= start_date
  ),
  retention_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE last_sign_in_at >= now() - interval '30 days')::numeric / COUNT(*) * 100), 1)
        ELSE 0
      END as monthly_retention
    FROM auth.users
    WHERE created_at <= now() - interval '30 days'
  ),
  user_growth AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'month', TO_CHAR(month_series, 'Mon'),
          'count', COALESCE(monthly_counts.count, 0)
        ) ORDER BY month_series
      ) as growth_data
    FROM generate_series(
      date_trunc('month', start_date), 
      date_trunc('month', now()), 
      '1 month'::interval
    ) as month_series
    LEFT JOIN (
      SELECT 
        date_trunc('month', created_at) as month,
        COUNT(*) as count
      FROM auth.users
      WHERE created_at >= start_date
      GROUP BY date_trunc('month', created_at)
    ) monthly_counts ON month_series = monthly_counts.month
  ),
  daily_active_trend AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'Mon DD'),
          'count', COALESCE(daily_counts.count, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(last_heartbeat) as day,
        COUNT(DISTINCT profile_id) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY DATE(last_heartbeat)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  recent_activity AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'user', COALESCE(p.display_name, p.username, 'Anonymous'),
          'action', activity_type,
          'timestamp', to_char(activity_time, 'HH24:MI')
        ) ORDER BY activity_time DESC
      ) as activity_data
    FROM (
      SELECT 
        fp.profile_id, 
        fp.joined_at as activity_time,
        'joined floq "' || f.title || '"' as activity_type
      FROM floq_participants fp
      JOIN floqs f ON f.id = fp.floq_id
      WHERE fp.joined_at >= now() - interval '2 hours'
      
      UNION ALL
      
      SELECT 
        fm.sender_id as profile_id,
        fm.created_at as activity_time,
        'sent message in floq' as activity_type
      FROM floq_messages fm
      WHERE fm.created_at >= now() - interval '2 hours'
      
      ORDER BY activity_time DESC
      LIMIT 10
    ) activities
    LEFT JOIN profiles p ON p.id = activities.profile_id
  )
  SELECT jsonb_build_object(
    'total_users', us.total_users,
    'weekly_new', us.weekly_new,
    'daily_active', acts.daily_active,
    'weekly_active', acts.weekly_active,
    'monthly_retention', rs.monthly_retention,
    'avg_session_minutes', ROUND(acts.avg_session_minutes::numeric, 1),
    'user_growth', COALESCE(ug.growth_data, '[]'::jsonb),
    'daily_active_trend', COALESCE(dat.daily_data, '[]'::jsonb),
    'recent_activity', COALESCE(ra.activity_data, '[]'::jsonb)
  ) INTO result
  FROM user_stats us, activity_stats acts, retention_stats rs, 
       user_growth ug, daily_active_trend dat, recent_activity ra;
  
  RETURN result;
END;
$function$"
"-- Function 39: public.get_dashboard_users
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_users CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_users(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH user_stats AS (
    SELECT 
      COUNT(*) as total_users,
      COUNT(*) FILTER (WHERE created_at >= start_date) as weekly_new
    FROM auth.users
  ),
  activity_stats AS (
    SELECT 
      COUNT(DISTINCT profile_id) FILTER (WHERE last_heartbeat >= now() - interval '24 hours') as daily_active,
      COUNT(DISTINCT profile_id) FILTER (WHERE last_heartbeat >= now() - interval '7 days') as weekly_active,
      COALESCE(AVG(EXTRACT(EPOCH FROM (expires_at - last_heartbeat))/60), 0) as avg_session_minutes
    FROM venue_live_presence 
    WHERE last_heartbeat >= start_date
  ),
  retention_stats AS (
    SELECT 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE last_sign_in_at >= now() - interval '30 days')::numeric / COUNT(*) * 100), 1)
        ELSE 0
      END as monthly_retention
    FROM auth.users
    WHERE created_at <= now() - interval '30 days'
  ),
  user_growth AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'month', TO_CHAR(month_series, 'Mon'),
          'count', COALESCE(monthly_counts.count, 0)
        ) ORDER BY month_series
      ) as growth_data
    FROM generate_series(
      date_trunc('month', start_date), 
      date_trunc('month', now()), 
      '1 month'::interval
    ) as month_series
    LEFT JOIN (
      SELECT 
        date_trunc('month', created_at) as month,
        COUNT(*) as count
      FROM auth.users
      WHERE created_at >= start_date
      GROUP BY date_trunc('month', created_at)
    ) monthly_counts ON month_series = monthly_counts.month
  ),
  daily_active_trend AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'day', TO_CHAR(day_series, 'Mon DD'),
          'count', COALESCE(daily_counts.count, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(last_heartbeat) as day,
        COUNT(DISTINCT profile_id) as count
      FROM venue_live_presence 
      WHERE last_heartbeat >= start_date
      GROUP BY DATE(last_heartbeat)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  recent_activity AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'user', COALESCE(p.display_name, p.username, 'Anonymous'),
          'action', activity_type,
          'timestamp', to_char(activity_time, 'HH24:MI')
        ) ORDER BY activity_time DESC
      ) as activity_data
    FROM (
      SELECT 
        fp.profile_id, 
        fp.joined_at as activity_time,
        'joined floq "' || f.title || '"' as activity_type
      FROM floq_participants fp
      JOIN floqs f ON f.id = fp.floq_id
      WHERE fp.joined_at >= now() - interval '2 hours'
      
      UNION ALL
      
      SELECT 
        fm.sender_id as profile_id,
        fm.created_at as activity_time,
        'sent message in floq' as activity_type
      FROM floq_messages fm
      WHERE fm.created_at >= now() - interval '2 hours'
      
      ORDER BY activity_time DESC
      LIMIT 10
    ) activities
    LEFT JOIN profiles p ON p.id = activities.profile_id
  )
  SELECT jsonb_build_object(
    'total_users', us.total_users,
    'weekly_new', us.weekly_new,
    'daily_active', acts.daily_active,
    'weekly_active', acts.weekly_active,
    'monthly_retention', rs.monthly_retention,
    'avg_session_minutes', ROUND(acts.avg_session_minutes::numeric, 1),
    'user_growth', COALESCE(ug.growth_data, '[]'::jsonb),
    'daily_active_trend', COALESCE(dat.daily_data, '[]'::jsonb),
    'recent_activity', COALESCE(ra.activity_data, '[]'::jsonb)
  ) INTO result
  FROM user_stats us, activity_stats acts, retention_stats rs, 
       user_growth ug, daily_active_trend dat, recent_activity ra;
  
  RETURN result;
END;
$function$"
"-- Function 40: public.get_dashboard_vibes
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_vibes CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_vibes(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH vibe_stats AS (
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(DISTINCT profile_id) as unique_users,
      COUNT(*) FILTER (WHERE started_at >= start_date) as recent_sessions,
      COALESCE(AVG(EXTRACT(EPOCH FROM (
        CASE WHEN active THEN now() ELSE started_at + interval '90 minutes' END - started_at
      ))/60), 0) as avg_session_minutes
    FROM user_vibe_states
    WHERE started_at >= start_date
  ),
  vibe_distribution AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe_tag::text,
          'count', count,
          'percentage', ROUND((count::numeric / NULLIF(SUM(count) OVER(), 0) * 100), 1)
        ) ORDER BY count DESC
      ) as distribution_data
    FROM (
      SELECT vibe_tag, COUNT(*) as count
      FROM user_vibe_states 
      WHERE started_at >= start_date
      GROUP BY vibe_tag
    ) vibe_counts
  ),
  daily_vibes AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'date', TO_CHAR(day_series, 'Mon DD'),
          'sessions', COALESCE(daily_counts.count, 0),
          'unique_users', COALESCE(daily_counts.users, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(started_at) as day,
        COUNT(*) as count,
        COUNT(DISTINCT profile_id) as users
      FROM user_vibe_states 
      WHERE started_at >= start_date
      GROUP BY DATE(started_at)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  hourly_vibes AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'hour', hour_val,
          'sessions', COALESCE(hourly_counts.count, 0)
        ) ORDER BY hour_val
      ) as hourly_data
    FROM generate_series(0, 23) as hour_val
    LEFT JOIN (
      SELECT 
        EXTRACT(HOUR FROM started_at) as hour,
        COUNT(*) as count
      FROM user_vibe_states 
      WHERE started_at >= start_date
      GROUP BY EXTRACT(HOUR FROM started_at)
    ) hourly_counts ON hour_val = hourly_counts.hour
  ),
  vibe_trends AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe_tag::text,
          'count', current_count,
          'trend', CASE 
            WHEN prev_count = 0 AND current_count > 0 THEN 'up'
            WHEN prev_count > 0 AND current_count = 0 THEN 'down'
            WHEN current_count > prev_count THEN 'up'
            WHEN current_count < prev_count THEN 'down'
            ELSE 'stable'
          END,
          'change', CASE 
            WHEN prev_count > 0 THEN ROUND(((current_count - prev_count)::numeric / prev_count * 100), 1)
            ELSE 0
          END
        ) ORDER BY current_count DESC
      ) as trends_data
    FROM (
      SELECT 
        vibe_tag,
        COUNT(*) FILTER (WHERE started_at >= now() - interval '3 days') as current_count,
        COUNT(*) FILTER (WHERE started_at >= now() - interval '6 days' AND started_at < now() - interval '3 days') as prev_count
      FROM user_vibe_states 
      WHERE started_at >= now() - interval '6 days'
      GROUP BY vibe_tag
      HAVING COUNT(*) > 0
    ) trend_calc
  ),
  active_sessions AS (
    SELECT 
      COUNT(*) as currently_active,
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe_tag::text,
          'started_minutes_ago', ROUND(EXTRACT(EPOCH FROM (now() - started_at))/60)
        )
      ) as active_data
    FROM user_vibe_states 
    WHERE active = true
  )
  SELECT jsonb_build_object(
    'total_sessions', vs.total_sessions,
    'unique_users', vs.unique_users,
    'recent_sessions', vs.recent_sessions,
    'avg_session_minutes', ROUND(vs.avg_session_minutes::numeric, 1),
    'currently_active', COALESCE(act.currently_active, 0),
    'vibe_distribution', COALESCE(vd.distribution_data, '[]'::jsonb),
    'daily_vibes', COALESCE(dv.daily_data, '[]'::jsonb),
    'hourly_vibes', COALESCE(hv.hourly_data, '[]'::jsonb),
    'vibe_trends', COALESCE(vt.trends_data, '[]'::jsonb),
    'active_sessions', COALESCE(act.active_data, '[]'::jsonb)
  ) INTO result
  FROM vibe_stats vs, vibe_distribution vd, daily_vibes dv, 
       hourly_vibes hv, vibe_trends vt, active_sessions act;
  
  RETURN result;
END;
$function$"
"-- Function 129: public.get_dashboard_vibes
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_dashboard_vibes CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_dashboard_vibes(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  start_date timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  WITH vibe_stats AS (
    SELECT 
      COUNT(*) as total_sessions,
      COUNT(DISTINCT profile_id) as unique_users,
      COUNT(*) FILTER (WHERE started_at >= start_date) as recent_sessions,
      COALESCE(AVG(EXTRACT(EPOCH FROM (
        CASE WHEN active THEN now() ELSE started_at + interval '90 minutes' END - started_at
      ))/60), 0) as avg_session_minutes
    FROM user_vibe_states
    WHERE started_at >= start_date
  ),
  vibe_distribution AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe_tag::text,
          'count', count,
          'percentage', ROUND((count::numeric / NULLIF(SUM(count) OVER(), 0) * 100), 1)
        ) ORDER BY count DESC
      ) as distribution_data
    FROM (
      SELECT vibe_tag, COUNT(*) as count
      FROM user_vibe_states 
      WHERE started_at >= start_date
      GROUP BY vibe_tag
    ) vibe_counts
  ),
  daily_vibes AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'date', TO_CHAR(day_series, 'Mon DD'),
          'sessions', COALESCE(daily_counts.count, 0),
          'unique_users', COALESCE(daily_counts.users, 0)
        ) ORDER BY day_series
      ) as daily_data
    FROM generate_series(start_date::date, now()::date, '1 day'::interval) as day_series
    LEFT JOIN (
      SELECT 
        DATE(started_at) as day,
        COUNT(*) as count,
        COUNT(DISTINCT profile_id) as users
      FROM user_vibe_states 
      WHERE started_at >= start_date
      GROUP BY DATE(started_at)
    ) daily_counts ON day_series::date = daily_counts.day
  ),
  hourly_vibes AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'hour', hour_val,
          'sessions', COALESCE(hourly_counts.count, 0)
        ) ORDER BY hour_val
      ) as hourly_data
    FROM generate_series(0, 23) as hour_val
    LEFT JOIN (
      SELECT 
        EXTRACT(HOUR FROM started_at) as hour,
        COUNT(*) as count
      FROM user_vibe_states 
      WHERE started_at >= start_date
      GROUP BY EXTRACT(HOUR FROM started_at)
    ) hourly_counts ON hour_val = hourly_counts.hour
  ),
  vibe_trends AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe_tag::text,
          'count', current_count,
          'trend', CASE 
            WHEN prev_count = 0 AND current_count > 0 THEN 'up'
            WHEN prev_count > 0 AND current_count = 0 THEN 'down'
            WHEN current_count > prev_count THEN 'up'
            WHEN current_count < prev_count THEN 'down'
            ELSE 'stable'
          END,
          'change', CASE 
            WHEN prev_count > 0 THEN ROUND(((current_count - prev_count)::numeric / prev_count * 100), 1)
            ELSE 0
          END
        ) ORDER BY current_count DESC
      ) as trends_data
    FROM (
      SELECT 
        vibe_tag,
        COUNT(*) FILTER (WHERE started_at >= now() - interval '3 days') as current_count,
        COUNT(*) FILTER (WHERE started_at >= now() - interval '6 days' AND started_at < now() - interval '3 days') as prev_count
      FROM user_vibe_states 
      WHERE started_at >= now() - interval '6 days'
      GROUP BY vibe_tag
      HAVING COUNT(*) > 0
    ) trend_calc
  ),
  active_sessions AS (
    SELECT 
      COUNT(*) as currently_active,
      jsonb_agg(
        jsonb_build_object(
          'vibe', vibe_tag::text,
          'started_minutes_ago', ROUND(EXTRACT(EPOCH FROM (now() - started_at))/60)
        )
      ) as active_data
    FROM user_vibe_states 
    WHERE active = true
  )
  SELECT jsonb_build_object(
    'total_sessions', vs.total_sessions,
    'unique_users', vs.unique_users,
    'recent_sessions', vs.recent_sessions,
    'avg_session_minutes', ROUND(vs.avg_session_minutes::numeric, 1),
    'currently_active', COALESCE(act.currently_active, 0),
    'vibe_distribution', COALESCE(vd.distribution_data, '[]'::jsonb),
    'daily_vibes', COALESCE(dv.daily_data, '[]'::jsonb),
    'hourly_vibes', COALESCE(hv.hourly_data, '[]'::jsonb),
    'vibe_trends', COALESCE(vt.trends_data, '[]'::jsonb),
    'active_sessions', COALESCE(act.active_data, '[]'::jsonb)
  ) INTO result
  FROM vibe_stats vs, vibe_distribution vd, daily_vibes dv, 
       hourly_vibes hv, vibe_trends vt, active_sessions act;
  
  RETURN result;
END;
$function$"
"-- Function 130: public.get_floq_full_details
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_floq_full_details CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_floq_full_details(p_floq_id uuid)
 RETURNS TABLE(id uuid, title text, description text, primary_vibe vibe_enum, flock_type flock_type_enum, starts_at timestamp with time zone, ends_at timestamp with time zone, visibility text, creator_id uuid, participant_count bigint, boost_count bigint, notifications_enabled boolean, mention_permissions mention_permissions_enum, join_approval_required boolean, activity_visibility activity_visibility_enum, welcome_message text, participants jsonb, pending_invites jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.title, f.description, f.primary_vibe, f.flock_type,
    f.starts_at, f.ends_at, f.visibility, f.creator_id,
    
    -- Aggregated counts
    (SELECT COUNT(*) FROM public.floq_participants fp WHERE fp.floq_id = f.id)::bigint as participant_count,
    (SELECT COUNT(*) FROM public.floq_boosts fb WHERE fb.floq_id = f.id AND fb.expires_at > now())::bigint as boost_count,
    
    -- Settings with COALESCE defaults and LEFT JOIN
    COALESCE(s.notifications_enabled, true) as notifications_enabled,
    COALESCE(s.mention_permissions, 'all'::mention_permissions_enum) as mention_permissions,
    COALESCE(s.join_approval_required, false) as join_approval_required,
    COALESCE(s.activity_visibility, 'public'::activity_visibility_enum) as activity_visibility,
    s.welcome_message,
    
    -- Participants JSON with DISTINCT ON for deduplication
    COALESCE((
      SELECT jsonb_agg(DISTINCT 
        jsonb_build_object(
          'profile_id', fp.profile_id,
          'display_name', pr.display_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', fp.role,
          'joined_at', fp.joined_at
        ) ORDER BY jsonb_build_object(
          'profile_id', fp.profile_id,
          'display_name', pr.display_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', fp.role,
          'joined_at', fp.joined_at
        )
      )
      FROM public.floq_participants fp
      LEFT JOIN public.profiles pr ON pr.id = fp.profile_id
      WHERE fp.floq_id = f.id
    ), '[]'::jsonb) as participants,
    
    -- Pending invitations JSON with ORDER BY inside aggregate (syntax fix)
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'invitee_id', fi.invitee_id,
          'invitee_username', pr.username,
          'invitee_display_name', pr.display_name,
          'status', fi.status,
          'sent_at', fi.created_at
        ) ORDER BY fi.created_at  -- ORDER BY inside aggregate
      ) FILTER (WHERE fi.status = 'pending')
      FROM public.floq_invitations fi
      LEFT JOIN public.profiles pr ON pr.id = fi.invitee_id
      WHERE fi.floq_id = f.id
        AND EXISTS (
          SELECT 1
          FROM public.floq_participants fp
          WHERE fp.floq_id = f.id
            AND fp.profile_id = auth.uid()
            AND fp.role IN ('creator', 'co-admin')
        )
    ), '[]'::jsonb) as pending_invites
    
  FROM public.floqs f
  LEFT JOIN public.floq_settings s ON s.floq_id = f.id
  WHERE f.id = p_floq_id
    AND (
      f.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.floq_participants fp 
        WHERE fp.floq_id = f.id AND fp.profile_id = auth.uid()
      )
      OR f.visibility = 'public'  -- Allow public floq access
    );
END;
$function$"
"-- Function 41: public.get_floq_full_details
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_floq_full_details CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_floq_full_details(p_floq_id uuid)
 RETURNS TABLE(id uuid, title text, description text, primary_vibe vibe_enum, flock_type flock_type_enum, starts_at timestamp with time zone, ends_at timestamp with time zone, visibility text, creator_id uuid, participant_count bigint, boost_count bigint, notifications_enabled boolean, mention_permissions mention_permissions_enum, join_approval_required boolean, activity_visibility activity_visibility_enum, welcome_message text, participants jsonb, pending_invites jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.title, f.description, f.primary_vibe, f.flock_type,
    f.starts_at, f.ends_at, f.visibility, f.creator_id,
    
    -- Aggregated counts
    (SELECT COUNT(*) FROM public.floq_participants fp WHERE fp.floq_id = f.id)::bigint as participant_count,
    (SELECT COUNT(*) FROM public.floq_boosts fb WHERE fb.floq_id = f.id AND fb.expires_at > now())::bigint as boost_count,
    
    -- Settings with COALESCE defaults and LEFT JOIN
    COALESCE(s.notifications_enabled, true) as notifications_enabled,
    COALESCE(s.mention_permissions, 'all'::mention_permissions_enum) as mention_permissions,
    COALESCE(s.join_approval_required, false) as join_approval_required,
    COALESCE(s.activity_visibility, 'public'::activity_visibility_enum) as activity_visibility,
    s.welcome_message,
    
    -- Participants JSON with DISTINCT ON for deduplication
    COALESCE((
      SELECT jsonb_agg(DISTINCT 
        jsonb_build_object(
          'profile_id', fp.profile_id,
          'display_name', pr.display_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', fp.role,
          'joined_at', fp.joined_at
        ) ORDER BY jsonb_build_object(
          'profile_id', fp.profile_id,
          'display_name', pr.display_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', fp.role,
          'joined_at', fp.joined_at
        )
      )
      FROM public.floq_participants fp
      LEFT JOIN public.profiles pr ON pr.id = fp.profile_id
      WHERE fp.floq_id = f.id
    ), '[]'::jsonb) as participants,
    
    -- Pending invitations JSON with ORDER BY inside aggregate (syntax fix)
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'invitee_id', fi.invitee_id,
          'invitee_username', pr.username,
          'invitee_display_name', pr.display_name,
          'status', fi.status,
          'sent_at', fi.created_at
        ) ORDER BY fi.created_at  -- ORDER BY inside aggregate
      ) FILTER (WHERE fi.status = 'pending')
      FROM public.floq_invitations fi
      LEFT JOIN public.profiles pr ON pr.id = fi.invitee_id
      WHERE fi.floq_id = f.id
        AND EXISTS (
          SELECT 1
          FROM public.floq_participants fp
          WHERE fp.floq_id = f.id
            AND fp.profile_id = auth.uid()
            AND fp.role IN ('creator', 'co-admin')
        )
    ), '[]'::jsonb) as pending_invites
    
  FROM public.floqs f
  LEFT JOIN public.floq_settings s ON s.floq_id = f.id
  WHERE f.id = p_floq_id
    AND (
      f.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.floq_participants fp 
        WHERE fp.floq_id = f.id AND fp.profile_id = auth.uid()
      )
      OR f.visibility = 'public'  -- Allow public floq access
    );
END;
$function$"
"-- Function 131: public.get_friend_trail
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_friend_trail CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_friend_trail(friend_profile_id uuid, hours_back integer DEFAULT 24, point_limit integer DEFAULT 50)
 RETURNS TABLE(lat numeric, lng numeric, captured_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    ST_Y(geom::geometry) AS lat,
    ST_X(geom::geometry) AS lng,
    captured_at
  FROM   public.raw_locations
  WHERE  profile_id     = friend_profile_id          -- table still uses profile_id
    AND  captured_at >= now() - (hours_back||' hours')::interval
  ORDER  BY captured_at DESC
  LIMIT  point_limit;
$function$"
"-- Function 42: public.get_friend_trail
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_friend_trail CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_friend_trail(friend_profile_id uuid, hours_back integer DEFAULT 24, point_limit integer DEFAULT 50)
 RETURNS TABLE(lat numeric, lng numeric, captured_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    ST_Y(geom::geometry) AS lat,
    ST_X(geom::geometry) AS lng,
    captured_at
  FROM   public.raw_locations
  WHERE  profile_id     = friend_profile_id          -- table still uses profile_id
    AND  captured_at >= now() - (hours_back||' hours')::interval
  ORDER  BY captured_at DESC
  LIMIT  point_limit;
$function$"
"-- Function 43: public.get_profile_stats
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_profile_stats CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_profile_stats(target_profile_id uuid, metres integer DEFAULT 100, seconds integer DEFAULT 3600)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  user_location geometry;
BEGIN
  -- Get user's current location
  SELECT location INTO user_location 
  FROM vibes_now 
  WHERE profile_id = target_profile_id;
  
  -- Build enhanced stats in single query
  SELECT jsonb_build_object(
    'friend_count', COALESCE(friend_stats.friend_count, 0),
    'crossings_7d', COALESCE(crossing_stats.crossings_7d, 0),
    'most_active_vibe', COALESCE(vibe_stats.most_active_vibe, 'unknown'),
    'days_active_this_month', COALESCE(activity_stats.days_active, 0),
    'total_achievements', COALESCE(achievement_stats.total_achievements, 0),
    'vibe_distribution', COALESCE(vibe_distribution.distribution, '[]'::jsonb),
    'recent_vibes', COALESCE(recent_vibes.history, '[]'::jsonb)
  ) INTO result
  FROM (
    -- Friend count (handle symmetry properly)
    SELECT COUNT(DISTINCT f.friend_id) as friend_count
    FROM friendships f
    WHERE f.profile_id = target_profile_id
  ) friend_stats
  CROSS JOIN (
    -- Crossings in last 7 days using PostGIS
    SELECT COUNT(DISTINCT v2.profile_id) as crossings_7d
    FROM vibes_log v1
    JOIN vibes_log v2 ON (
      v1.profile_id = target_profile_id
      AND v2.profile_id != target_profile_id
      AND ST_DWithin(v1.location, v2.location, metres)
      AND abs(extract(epoch from (v1.ts - v2.ts))) <= seconds
    )
    WHERE v1.ts >= (now() - interval '7 days')
      AND v2.ts >= (now() - interval '7 days')
  ) crossing_stats
  CROSS JOIN (
    -- Most active vibe this week
    SELECT vibe::text as most_active_vibe
    FROM vibes_log
    WHERE profile_id = target_profile_id 
      AND ts >= (now() - interval '7 days')
    GROUP BY vibe
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) vibe_stats
  CROSS JOIN (
    -- Days active this month
    SELECT COUNT(DISTINCT DATE(ts)) as days_active
    FROM vibes_log
    WHERE profile_id = target_profile_id 
      AND ts >= date_trunc('month', now())
  ) activity_stats
  CROSS JOIN (
    -- Total achievements
    SELECT COUNT(*) as total_achievements
    FROM achievements
    WHERE profile_id = target_profile_id
  ) achievement_stats
  CROSS JOIN (
    -- Vibe distribution for last 30 days (for personality analysis)
    SELECT jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'count', count,
        'percentage', ROUND((count * 100.0 / total_count), 1)
      ) ORDER BY count DESC
    ) as distribution
    FROM (
      SELECT 
        vibe,
        COUNT(*) as count,
        SUM(COUNT(*)) OVER() as total_count
      FROM vibes_log
      WHERE profile_id = target_profile_id 
        AND ts >= (now() - interval '30 days')
      GROUP BY vibe
    ) vibe_counts
  ) vibe_distribution
  CROSS JOIN (
    -- Recent vibe history for sparkline (last 50 entries)
    SELECT jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'timestamp', extract(epoch from ts),
        'ts', ts
      ) ORDER BY ts DESC
    ) as history
    FROM (
      SELECT vibe, ts
      FROM vibes_log
      WHERE profile_id = target_profile_id 
      ORDER BY ts DESC
      LIMIT 50
    ) recent_log
  ) recent_vibes;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$"
"-- Function 132: public.get_profile_stats
-- Drop statement:
DROP FUNCTION IF EXISTS public.get_profile_stats CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.get_profile_stats(target_profile_id uuid, metres integer DEFAULT 100, seconds integer DEFAULT 3600)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  user_location geometry;
BEGIN
  -- Get user's current location
  SELECT location INTO user_location 
  FROM vibes_now 
  WHERE profile_id = target_profile_id;
  
  -- Build enhanced stats in single query
  SELECT jsonb_build_object(
    'friend_count', COALESCE(friend_stats.friend_count, 0),
    'crossings_7d', COALESCE(crossing_stats.crossings_7d, 0),
    'most_active_vibe', COALESCE(vibe_stats.most_active_vibe, 'unknown'),
    'days_active_this_month', COALESCE(activity_stats.days_active, 0),
    'total_achievements', COALESCE(achievement_stats.total_achievements, 0),
    'vibe_distribution', COALESCE(vibe_distribution.distribution, '[]'::jsonb),
    'recent_vibes', COALESCE(recent_vibes.history, '[]'::jsonb)
  ) INTO result
  FROM (
    -- Friend count (handle symmetry properly)
    SELECT COUNT(DISTINCT f.friend_id) as friend_count
    FROM friendships f
    WHERE f.profile_id = target_profile_id
  ) friend_stats
  CROSS JOIN (
    -- Crossings in last 7 days using PostGIS
    SELECT COUNT(DISTINCT v2.profile_id) as crossings_7d
    FROM vibes_log v1
    JOIN vibes_log v2 ON (
      v1.profile_id = target_profile_id
      AND v2.profile_id != target_profile_id
      AND ST_DWithin(v1.location, v2.location, metres)
      AND abs(extract(epoch from (v1.ts - v2.ts))) <= seconds
    )
    WHERE v1.ts >= (now() - interval '7 days')
      AND v2.ts >= (now() - interval '7 days')
  ) crossing_stats
  CROSS JOIN (
    -- Most active vibe this week
    SELECT vibe::text as most_active_vibe
    FROM vibes_log
    WHERE profile_id = target_profile_id 
      AND ts >= (now() - interval '7 days')
    GROUP BY vibe
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) vibe_stats
  CROSS JOIN (
    -- Days active this month
    SELECT COUNT(DISTINCT DATE(ts)) as days_active
    FROM vibes_log
    WHERE profile_id = target_profile_id 
      AND ts >= date_trunc('month', now())
  ) activity_stats
  CROSS JOIN (
    -- Total achievements
    SELECT COUNT(*) as total_achievements
    FROM achievements
    WHERE profile_id = target_profile_id
  ) achievement_stats
  CROSS JOIN (
    -- Vibe distribution for last 30 days (for personality analysis)
    SELECT jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'count', count,
        'percentage', ROUND((count * 100.0 / total_count), 1)
      ) ORDER BY count DESC
    ) as distribution
    FROM (
      SELECT 
        vibe,
        COUNT(*) as count,
        SUM(COUNT(*)) OVER() as total_count
      FROM vibes_log
      WHERE profile_id = target_profile_id 
        AND ts >= (now() - interval '30 days')
      GROUP BY vibe
    ) vibe_counts
  ) vibe_distribution
  CROSS JOIN (
    -- Recent vibe history for sparkline (last 50 entries)
    SELECT jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'timestamp', extract(epoch from ts),
        'ts', ts
      ) ORDER BY ts DESC
    ) as history
    FROM (
      SELECT vibe, ts
      FROM vibes_log
      WHERE profile_id = target_profile_id 
      ORDER BY ts DESC
      LIMIT 50
    ) recent_log
  ) recent_vibes;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$"
"-- Function 133: public.invite_friends
-- Drop statement:
DROP FUNCTION IF EXISTS public.invite_friends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.invite_friends(p_plan_id uuid, p_profile_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _creator uuid;
  _inserted json;
begin
  if cardinality(p_profile_ids) = 0 then
    return '[]'::json;
  end if;

  -- fast ownership check (security definer means we still need to guard!)
  select creator_id into _creator
    from public.floq_plans
   where id = p_plan_id;

  if _creator <> auth.uid() then
    raise exception 'Permission denied – only plan creator may invite';
  end if;

  insert into public.plan_invites (plan_id, profile_id)
  select p_plan_id, unnest(p_profile_ids)
  on conflict do nothing
  returning json_build_object(
    'plan_id', plan_id,
    'profile_id', profile_id,
    'status' , status
  )
  into _inserted;

  return coalesce(
    (select json_agg(_inserted)),
    '[]'::json
  );
end;
$function$"
"-- Function 44: public.invite_friends
-- Drop statement:
DROP FUNCTION IF EXISTS public.invite_friends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.invite_friends(p_plan_id uuid, p_profile_ids uuid[])
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _creator uuid;
  _inserted json;
begin
  if cardinality(p_profile_ids) = 0 then
    return '[]'::json;
  end if;

  -- fast ownership check (security definer means we still need to guard!)
  select creator_id into _creator
    from public.floq_plans
   where id = p_plan_id;

  if _creator <> auth.uid() then
    raise exception 'Permission denied – only plan creator may invite';
  end if;

  insert into public.plan_invites (plan_id, profile_id)
  select p_plan_id, unnest(p_profile_ids)
  on conflict do nothing
  returning json_build_object(
    'plan_id', plan_id,
    'profile_id', profile_id,
    'status' , status
  )
  into _inserted;

  return coalesce(
    (select json_agg(_inserted)),
    '[]'::json
  );
end;
$function$"
"-- Function 45: public.is_live_now
-- Drop statement:
DROP FUNCTION IF EXISTS public.is_live_now CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.is_live_now(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
           ( SELECT CASE
                      WHEN NOT is_live         THEN FALSE
                      WHEN ends_at IS NULL     THEN TRUE
                      ELSE   now() < ends_at
                    END
               FROM public.friend_share_pref
               WHERE profile_id = uid
               LIMIT 1 ),
           FALSE);
$function$"
"-- Function 134: public.is_live_now
-- Drop statement:
DROP FUNCTION IF EXISTS public.is_live_now CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.is_live_now(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(
           ( SELECT CASE
                      WHEN NOT is_live         THEN FALSE
                      WHEN ends_at IS NULL     THEN TRUE
                      ELSE   now() < ends_at
                    END
               FROM public.friend_share_pref
               WHERE profile_id = uid
               LIMIT 1 ),
           FALSE);
$function$"
"-- Function 135: public.join_floq
-- Drop statement:
DROP FUNCTION IF EXISTS public.join_floq CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.join_floq(p_floq_id uuid, p_profile_id uuid DEFAULT NULL::uuid, p_use_demo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_floq record;
  v_participants int;
  v_profile_id uuid;
  schema_name text;
BEGIN
  -- Set schema and user ID
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  v_profile_id := COALESCE(p_profile_id, auth.uid());

  -- Validate inputs
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND p_floq_id::text LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Demo floq ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND p_floq_id::text NOT LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Production floq ID not allowed in demo mode';
  END IF;

  -- Lock the floq row to prevent race conditions
  EXECUTE format('SELECT * FROM %I.floqs WHERE id = $1 FOR UPDATE', schema_name)
  INTO v_floq
  USING p_floq_id;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Floq not found'; 
  END IF;
  
  IF v_floq.ends_at <= now() THEN 
    RAISE EXCEPTION 'Floq has expired'; 
  END IF;

  -- Check current participant count before inserting
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;
  
  -- Enforce capacity before insert
  IF v_floq.max_participants IS NOT NULL AND v_participants >= v_floq.max_participants THEN
    RAISE EXCEPTION 'Floq is full (capacity: %)', v_floq.max_participants;
  END IF;

  -- Race-safe insert
  EXECUTE format(
    'INSERT INTO %I.floq_participants (floq_id, profile_id, role) VALUES ($1, $2, $3) ON CONFLICT (floq_id, profile_id) DO NOTHING',
    schema_name
  ) USING p_floq_id, v_profile_id, 'member';

  -- Get final participant count
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'profile_id', v_profile_id
  );
END;
$function$"
"-- Function 46: public.join_floq
-- Drop statement:
DROP FUNCTION IF EXISTS public.join_floq CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.join_floq(p_floq_id uuid, p_profile_id uuid DEFAULT NULL::uuid, p_use_demo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_floq record;
  v_participants int;
  v_profile_id uuid;
  schema_name text;
BEGIN
  -- Set schema and user ID
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  v_profile_id := COALESCE(p_profile_id, auth.uid());

  -- Validate inputs
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND p_floq_id::text LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Demo floq ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND p_floq_id::text NOT LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Production floq ID not allowed in demo mode';
  END IF;

  -- Lock the floq row to prevent race conditions
  EXECUTE format('SELECT * FROM %I.floqs WHERE id = $1 FOR UPDATE', schema_name)
  INTO v_floq
  USING p_floq_id;

  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Floq not found'; 
  END IF;
  
  IF v_floq.ends_at <= now() THEN 
    RAISE EXCEPTION 'Floq has expired'; 
  END IF;

  -- Check current participant count before inserting
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;
  
  -- Enforce capacity before insert
  IF v_floq.max_participants IS NOT NULL AND v_participants >= v_floq.max_participants THEN
    RAISE EXCEPTION 'Floq is full (capacity: %)', v_floq.max_participants;
  END IF;

  -- Race-safe insert
  EXECUTE format(
    'INSERT INTO %I.floq_participants (floq_id, profile_id, role) VALUES ($1, $2, $3) ON CONFLICT (floq_id, profile_id) DO NOTHING',
    schema_name
  ) USING p_floq_id, v_profile_id, 'member';

  -- Get final participant count
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'profile_id', v_profile_id
  );
END;
$function$"
"-- Function 47: public.join_or_leave_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.join_or_leave_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.join_or_leave_plan(p_plan_id uuid, p_join boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_is_participant BOOLEAN;
  plan_floq_id UUID;
  current_count INTEGER;
BEGIN
  -- Check if plan exists and get floq_id
  SELECT floq_id INTO plan_floq_id
  FROM public.floq_plans
  WHERE id = p_plan_id;
  
  IF plan_floq_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;
  
  -- Check if user is participant of the floq
  SELECT EXISTS(
    SELECT 1 FROM public.floq_participants
    WHERE floq_id = plan_floq_id AND profile_id = auth.uid()
  ) INTO user_is_participant;
  
  IF NOT user_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be floq member to RSVP');
  END IF;
  
  -- Check current participation status
  SELECT EXISTS(
    SELECT 1 FROM public.plan_participants
    WHERE plan_id = p_plan_id AND profile_id = auth.uid()
  ) INTO user_is_participant;
  
  IF p_join THEN
    -- Join the plan
    IF user_is_participant THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already joined this plan');
    END IF;
    
    INSERT INTO public.plan_participants (plan_id, profile_id)
    VALUES (p_plan_id, auth.uid())
    ON CONFLICT (plan_id, profile_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined plan');
  ELSE
    -- Leave the plan
    IF NOT user_is_participant THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not joined to this plan');
    END IF;
    
    DELETE FROM public.plan_participants
    WHERE plan_id = p_plan_id AND profile_id = auth.uid();
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully left plan');
  END IF;
END;
$function$"
"-- Function 137: public.join_or_leave_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.join_or_leave_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.join_or_leave_plan(p_plan_id uuid, p_join boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_is_participant BOOLEAN;
  plan_floq_id UUID;
  current_count INTEGER;
BEGIN
  -- Check if plan exists and get floq_id
  SELECT floq_id INTO plan_floq_id
  FROM public.floq_plans
  WHERE id = p_plan_id;
  
  IF plan_floq_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;
  
  -- Check if user is participant of the floq
  SELECT EXISTS(
    SELECT 1 FROM public.floq_participants
    WHERE floq_id = plan_floq_id AND profile_id = auth.uid()
  ) INTO user_is_participant;
  
  IF NOT user_is_participant THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must be floq member to RSVP');
  END IF;
  
  -- Check current participation status
  SELECT EXISTS(
    SELECT 1 FROM public.plan_participants
    WHERE plan_id = p_plan_id AND profile_id = auth.uid()
  ) INTO user_is_participant;
  
  IF p_join THEN
    -- Join the plan
    IF user_is_participant THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already joined this plan');
    END IF;
    
    INSERT INTO public.plan_participants (plan_id, profile_id)
    VALUES (p_plan_id, auth.uid())
    ON CONFLICT (plan_id, profile_id) DO NOTHING;
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully joined plan');
  ELSE
    -- Leave the plan
    IF NOT user_is_participant THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not joined to this plan');
    END IF;
    
    DELETE FROM public.plan_participants
    WHERE plan_id = p_plan_id AND profile_id = auth.uid();
    
    RETURN jsonb_build_object('success', true, 'message', 'Successfully left plan');
  END IF;
END;
$function$"
"-- Function 138: public.leave_floq
-- Drop statement:
DROP FUNCTION IF EXISTS public.leave_floq CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.leave_floq(p_floq_id uuid, p_profile_id uuid DEFAULT NULL::uuid, p_use_demo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participants int;
  v_profile_id uuid;
  v_deleted_count int;
  schema_name text;
BEGIN
  -- Set schema and user ID
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  v_profile_id := COALESCE(p_profile_id, auth.uid());

  -- Validate inputs
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND p_floq_id::text LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Demo floq ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND p_floq_id::text NOT LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Production floq ID not allowed in demo mode';
  END IF;

  -- Check if floq exists
  EXECUTE format('SELECT 1 FROM %I.floqs WHERE id = $1', schema_name)
  USING p_floq_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Floq not found';
  END IF;

  -- Remove participant
  EXECUTE format('DELETE FROM %I.floq_participants WHERE floq_id = $1 AND profile_id = $2', schema_name)
  USING p_floq_id, v_profile_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'User was not a participant in this floq';
  END IF;

  -- Get updated participant count
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'profile_id', v_profile_id
  );
END;
$function$"
"-- Function 48: public.leave_floq
-- Drop statement:
DROP FUNCTION IF EXISTS public.leave_floq CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.leave_floq(p_floq_id uuid, p_profile_id uuid DEFAULT NULL::uuid, p_use_demo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participants int;
  v_profile_id uuid;
  v_deleted_count int;
  schema_name text;
BEGIN
  -- Set schema and user ID
  schema_name := CASE WHEN p_use_demo THEN 'demo' ELSE 'public' END;
  v_profile_id := COALESCE(p_profile_id, auth.uid());

  -- Validate inputs
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Prevent demo IDs in production and vice versa
  IF NOT p_use_demo AND p_floq_id::text LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Demo floq ID not allowed in production mode';
  END IF;
  
  IF p_use_demo AND p_floq_id::text NOT LIKE 'demo-%' THEN
    RAISE EXCEPTION 'Production floq ID not allowed in demo mode';
  END IF;

  -- Check if floq exists
  EXECUTE format('SELECT 1 FROM %I.floqs WHERE id = $1', schema_name)
  USING p_floq_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Floq not found';
  END IF;

  -- Remove participant
  EXECUTE format('DELETE FROM %I.floq_participants WHERE floq_id = $1 AND profile_id = $2', schema_name)
  USING p_floq_id, v_profile_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'User was not a participant in this floq';
  END IF;

  -- Get updated participant count
  EXECUTE format('SELECT COUNT(*) FROM %I.floq_participants WHERE floq_id = $1', schema_name)
  INTO v_participants
  USING p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'profile_id', v_profile_id
  );
END;
$function$"
"-- Function 49: public.log_invite_decline
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_invite_decline CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_invite_decline(p_profile_id uuid, p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_type TEXT;
  existing_count INT;
BEGIN
  -- Get the plan type
  SELECT COALESCE(vibe_tags->>0, 'general')
  INTO plan_type
  FROM public.floq_plans
  WHERE id = p_plan_id;

  -- Upsert preference record if plan_type is found
  IF plan_type IS NOT NULL THEN
    UPDATE public.user_preferences
    SET declined_plan_types = 
      jsonb_set(
        declined_plan_types,
        ARRAY[plan_type],
        to_jsonb(
          COALESCE(
            (declined_plan_types ->> plan_type)::int,
            0
          ) + 1
        ),
        true
      ),
      updated_at = now()
    WHERE profile_id = p_profile_id;
  END IF;
END;
$function$"
"-- Function 139: public.log_invite_decline
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_invite_decline CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_invite_decline(p_profile_id uuid, p_plan_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_type TEXT;
  existing_count INT;
BEGIN
  -- Get the plan type
  SELECT COALESCE(vibe_tags->>0, 'general')
  INTO plan_type
  FROM public.floq_plans
  WHERE id = p_plan_id;

  -- Upsert preference record if plan_type is found
  IF plan_type IS NOT NULL THEN
    UPDATE public.user_preferences
    SET declined_plan_types = 
      jsonb_set(
        declined_plan_types,
        ARRAY[plan_type],
        to_jsonb(
          COALESCE(
            (declined_plan_types ->> plan_type)::int,
            0
          ) + 1
        ),
        true
      ),
      updated_at = now()
    WHERE profile_id = p_profile_id;
  END IF;
END;
$function$"
"-- Function 50: public.log_plan_activity
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_plan_activity CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_plan_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'plan_stops' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.created_by, 'stop_added', NEW.id, 'stop',
              jsonb_build_object('title', NEW.title, 'stop_order', NEW.stop_order));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, auth.uid(), 'stop_updated', NEW.id, 'stop',
              jsonb_build_object('title', NEW.title));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (OLD.plan_id, auth.uid(), 'stop_removed', OLD.id, 'stop',
              jsonb_build_object('title', OLD.title));
    END IF;
  ELSIF TG_TABLE_NAME = 'plan_votes' THEN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.profile_id, 'vote_cast', NEW.id, 'vote',
              jsonb_build_object('vote_type', NEW.vote_type, 'emoji_reaction', NEW.emoji_reaction));
    END IF;
  ELSIF TG_TABLE_NAME = 'plan_comments' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.profile_id, 'comment_added', NEW.id, 'comment',
              jsonb_build_object('content_preview', LEFT(NEW.content, 50)));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$"
"-- Function 140: public.log_plan_activity
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_plan_activity CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_plan_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'plan_stops' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.created_by, 'stop_added', NEW.id, 'stop',
              jsonb_build_object('title', NEW.title, 'stop_order', NEW.stop_order));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, auth.uid(), 'stop_updated', NEW.id, 'stop',
              jsonb_build_object('title', NEW.title));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (OLD.plan_id, auth.uid(), 'stop_removed', OLD.id, 'stop',
              jsonb_build_object('title', OLD.title));
    END IF;
  ELSIF TG_TABLE_NAME = 'plan_votes' THEN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.profile_id, 'vote_cast', NEW.id, 'vote',
              jsonb_build_object('vote_type', NEW.vote_type, 'emoji_reaction', NEW.emoji_reaction));
    END IF;
  ELSIF TG_TABLE_NAME = 'plan_comments' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.plan_activities (plan_id, profile_id, activity_type, entity_id, entity_type, metadata)
      VALUES (NEW.plan_id, NEW.profile_id, 'comment_added', NEW.id, 'comment',
              jsonb_build_object('content_preview', LEFT(NEW.content, 50)));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$"
"-- Function 51: public.log_plan_participant_change
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_plan_participant_change CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_plan_participant_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- RSVP change
  IF TG_OP = 'UPDATE' AND OLD.rsvp_status IS DISTINCT FROM NEW.rsvp_status THEN
    INSERT INTO public.floq_activity (floq_id, plan_id, profile_id, kind, content)
    VALUES (
      (SELECT floq_id FROM public.floq_plans WHERE id = NEW.plan_id),
      NEW.plan_id,
      NEW.profile_id,
      'rsvp_changed',
      jsonb_build_object(
        'from_status', OLD.rsvp_status,
        'to_status',   NEW.rsvp_status,
        'user_name',   COALESCE(NEW.guest_name, (
                          SELECT display_name FROM public.profiles WHERE id = NEW.profile_id
                        ), 'User')
      )
    );
  END IF;

  -- Guest invited (email OR phone present)
  IF TG_OP = 'INSERT'
     AND (NEW.guest_email IS NOT NULL OR NEW.guest_phone IS NOT NULL) THEN
    INSERT INTO public.floq_activity (floq_id, plan_id, profile_id, kind, content)
    VALUES (
      (SELECT floq_id FROM public.floq_plans WHERE id = NEW.plan_id),
      NEW.plan_id,
      NEW.profile_id,
      'guest_invited',
      jsonb_build_object(
        'guest_name',  NEW.guest_name,
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone
      )
    );
  END IF;

  RETURN NEW;
END;
$function$"
"-- Function 141: public.log_plan_participant_change
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_plan_participant_change CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_plan_participant_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- RSVP change
  IF TG_OP = 'UPDATE' AND OLD.rsvp_status IS DISTINCT FROM NEW.rsvp_status THEN
    INSERT INTO public.floq_activity (floq_id, plan_id, profile_id, kind, content)
    VALUES (
      (SELECT floq_id FROM public.floq_plans WHERE id = NEW.plan_id),
      NEW.plan_id,
      NEW.profile_id,
      'rsvp_changed',
      jsonb_build_object(
        'from_status', OLD.rsvp_status,
        'to_status',   NEW.rsvp_status,
        'user_name',   COALESCE(NEW.guest_name, (
                          SELECT display_name FROM public.profiles WHERE id = NEW.profile_id
                        ), 'User')
      )
    );
  END IF;

  -- Guest invited (email OR phone present)
  IF TG_OP = 'INSERT'
     AND (NEW.guest_email IS NOT NULL OR NEW.guest_phone IS NOT NULL) THEN
    INSERT INTO public.floq_activity (floq_id, plan_id, profile_id, kind, content)
    VALUES (
      (SELECT floq_id FROM public.floq_plans WHERE id = NEW.plan_id),
      NEW.plan_id,
      NEW.profile_id,
      'guest_invited',
      jsonb_build_object(
        'guest_name',  NEW.guest_name,
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone
      )
    );
  END IF;

  RETURN NEW;
END;
$function$"
"-- Function 123: public.log_presence_if_needed
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_presence_if_needed CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_presence_if_needed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _geo geography := geography(st_makepoint(ST_X(NEW.location), ST_Y(NEW.location)));
BEGIN
  IF public.should_log_presence(NEW.profile_id, _geo) THEN
    INSERT INTO public.vibes_log (profile_id, ts, location, venue_id, vibe)
    VALUES (NEW.profile_id, NEW.updated_at, _geo, NEW.venue_id, NEW.vibe);
  END IF;
  RETURN NULL; -- AFTER trigger -> don't modify NEW
END;
$function$"
"-- Function 52: public.log_presence_if_needed
-- Drop statement:
DROP FUNCTION IF EXISTS public.log_presence_if_needed CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.log_presence_if_needed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _geo geography := geography(st_makepoint(ST_X(NEW.location), ST_Y(NEW.location)));
BEGIN
  IF public.should_log_presence(NEW.profile_id, _geo) THEN
    INSERT INTO public.vibes_log (profile_id, ts, location, venue_id, vibe)
    VALUES (NEW.profile_id, NEW.updated_at, _geo, NEW.venue_id, NEW.vibe);
  END IF;
  RETURN NULL; -- AFTER trigger -> don't modify NEW
END;
$function$"
"-- Function 53: public.mark_notifications_read
-- Drop statement:
DROP FUNCTION IF EXISTS public.mark_notifications_read CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids uuid[] DEFAULT NULL::uuid[], mark_all_for_user boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer;
BEGIN
  IF mark_all_for_user THEN
    -- Mark all unread notifications for the user as read
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE profile_id = auth.uid() 
      AND read_at IS NULL;
  ELSIF notification_ids IS NOT NULL THEN
    -- Mark specific notifications as read
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE id = ANY(notification_ids)
      AND profile_id = auth.uid()
      AND read_at IS NULL;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$"
"-- Function 136: public.mark_notifications_read
-- Drop statement:
DROP FUNCTION IF EXISTS public.mark_notifications_read CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids uuid[] DEFAULT NULL::uuid[], mark_all_for_user boolean DEFAULT false)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer;
BEGIN
  IF mark_all_for_user THEN
    -- Mark all unread notifications for the user as read
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE profile_id = auth.uid() 
      AND read_at IS NULL;
  ELSIF notification_ids IS NOT NULL THEN
    -- Mark specific notifications as read
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE id = ANY(notification_ids)
      AND profile_id = auth.uid()
      AND read_at IS NULL;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$"
"-- Function 54: public.match_locations_batch
-- Drop statement:
DROP FUNCTION IF EXISTS public.match_locations_batch CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.match_locations_batch(_since timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE inserted INT := 0;
BEGIN
  WITH candidates AS (
      SELECT rl.id,
             rl.profile_id,
             rl.captured_at,
             rl.geom,
             v.id            AS venue_id,
             v.radius_m,
             ST_Distance(rl.geom,v.geom)::NUMERIC AS dist
      FROM   public.raw_locations rl
      JOIN   public.venues v
             ON ST_DWithin(rl.geom::geography, v.geom::geography, v.radius_m)
      WHERE  rl.captured_at >= _since
        AND NOT EXISTS (   -- suppress if we've already logged a visit <20 min ago
              SELECT 1
              FROM   public.venue_visits pv
              WHERE  pv.profile_id   = rl.profile_id
                AND  pv.venue_id  = v.id
                AND  rl.captured_at - pv.arrived_at < INTERVAL '20 minutes'
            )
  ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY id ORDER BY dist) AS rn
      FROM   candidates
  )
  INSERT INTO public.venue_visits(profile_id, venue_id, arrived_at, distance_m)
  SELECT profile_id, venue_id, captured_at, dist
  FROM   ranked
  WHERE  rn = 1
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$function$"
"-- Function 142: public.match_locations_batch
-- Drop statement:
DROP FUNCTION IF EXISTS public.match_locations_batch CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.match_locations_batch(_since timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE inserted INT := 0;
BEGIN
  WITH candidates AS (
      SELECT rl.id,
             rl.profile_id,
             rl.captured_at,
             rl.geom,
             v.id            AS venue_id,
             v.radius_m,
             ST_Distance(rl.geom,v.geom)::NUMERIC AS dist
      FROM   public.raw_locations rl
      JOIN   public.venues v
             ON ST_DWithin(rl.geom::geography, v.geom::geography, v.radius_m)
      WHERE  rl.captured_at >= _since
        AND NOT EXISTS (   -- suppress if we've already logged a visit <20 min ago
              SELECT 1
              FROM   public.venue_visits pv
              WHERE  pv.profile_id   = rl.profile_id
                AND  pv.venue_id  = v.id
                AND  rl.captured_at - pv.arrived_at < INTERVAL '20 minutes'
            )
  ), ranked AS (
      SELECT *, row_number() OVER (PARTITION BY id ORDER BY dist) AS rn
      FROM   candidates
  )
  INSERT INTO public.venue_visits(profile_id, venue_id, arrived_at, distance_m)
  SELECT profile_id, venue_id, captured_at, dist
  FROM   ranked
  WHERE  rn = 1
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$function$"
"-- Function 143: public.match_unmatched_pings
-- Drop statement:
DROP FUNCTION IF EXISTS public.match_unmatched_pings CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _since constant interval := '10 minutes';   -- look-back window
  ins    int := 0;
BEGIN
  WITH cte AS (
    SELECT
      rl.id,
      rl.profile_id,
      rl.captured_at,
      rl.geom,
      v.id          AS venue_id,
      v.radius_m,
      ST_Distance(rl.geom, v.geom)::numeric AS dist,
      ROW_NUMBER() OVER (PARTITION BY rl.id
                         ORDER BY ST_Distance(rl.geom, v.geom)) AS rn
    FROM  public.raw_locations rl
    JOIN  public.venues  v
          ON  rl.geohash5 = v.geohash5              -- ⚡ bucket filter
         AND ST_DWithin(rl.geom, v.geom, v.radius_m) -- exact check
    WHERE rl.captured_at >= now() - _since
      AND rl.acc <= 50                              -- ⚡ GPS accuracy filter
  )
  INSERT INTO public.venue_visits(profile_id, venue_id, arrived_at, distance_m)
  SELECT profile_id, venue_id, captured_at, dist
  FROM   cte
  WHERE  rn = 1                                    -- keep closest only
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END;
$function$"
"-- Function 55: public.match_unmatched_pings
-- Drop statement:
DROP FUNCTION IF EXISTS public.match_unmatched_pings CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _since constant interval := '10 minutes';   -- look-back window
  ins    int := 0;
BEGIN
  WITH cte AS (
    SELECT
      rl.id,
      rl.profile_id,
      rl.captured_at,
      rl.geom,
      v.id          AS venue_id,
      v.radius_m,
      ST_Distance(rl.geom, v.geom)::numeric AS dist,
      ROW_NUMBER() OVER (PARTITION BY rl.id
                         ORDER BY ST_Distance(rl.geom, v.geom)) AS rn
    FROM  public.raw_locations rl
    JOIN  public.venues  v
          ON  rl.geohash5 = v.geohash5              -- ⚡ bucket filter
         AND ST_DWithin(rl.geom, v.geom, v.radius_m) -- exact check
    WHERE rl.captured_at >= now() - _since
      AND rl.acc <= 50                              -- ⚡ GPS accuracy filter
  )
  INSERT INTO public.venue_visits(profile_id, venue_id, arrived_at, distance_m)
  SELECT profile_id, venue_id, captured_at, dist
  FROM   cte
  WHERE  rn = 1                                    -- keep closest only
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END;
$function$"
"-- Function 144: public.merge_venue_visits
-- Drop statement:
DROP FUNCTION IF EXISTS public.merge_venue_visits CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.merge_venue_visits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE 
  _updated INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id, profile_id, venue_id,
           arrived_at,
           LAG(arrived_at) OVER (PARTITION BY profile_id,venue_id ORDER BY arrived_at) AS prev_at
    FROM   public.venue_visits
    WHERE  departed_at IS NULL
      AND  arrived_at < now() - INTERVAL '5 minutes'
  )
  UPDATE public.venue_visits v
     SET departed_at = ranked.arrived_at
  FROM ranked
  WHERE v.id = ranked.id
    AND ranked.prev_at IS NULL;                 -- first row after a gap

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END $function$"
"-- Function 56: public.merge_venue_visits
-- Drop statement:
DROP FUNCTION IF EXISTS public.merge_venue_visits CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.merge_venue_visits()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE 
  _updated INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id, profile_id, venue_id,
           arrived_at,
           LAG(arrived_at) OVER (PARTITION BY profile_id,venue_id ORDER BY arrived_at) AS prev_at
    FROM   public.venue_visits
    WHERE  departed_at IS NULL
      AND  arrived_at < now() - INTERVAL '5 minutes'
  )
  UPDATE public.venue_visits v
     SET departed_at = ranked.arrived_at
  FROM ranked
  WHERE v.id = ranked.id
    AND ranked.prev_at IS NULL;                 -- first row after a gap

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END $function$"
"-- Function 57: public.merge_visits_into_stays
-- Drop statement:
DROP FUNCTION IF EXISTS public.merge_visits_into_stays CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.merge_visits_into_stays(_lookback interval DEFAULT '00:15:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  merged int := 0;
begin
  /* “raw” visits in the look-back window */
  with v as (
    select *
    from   public.venue_visits
    where  arrived_at >= now() - _lookback
  ), groups as (
    /* rank contiguous pings per user & venue (gap <10 min) */
    select
      v.*,
      lag(arrived_at) over (partition by profile_id, venue_id order by arrived_at) as prev_ts,
      sum( case
              when lag(arrived_at) over (partition by profile_id, venue_id order by arrived_at)
                   is null
                   or arrived_at - lag(arrived_at) over (partition by profile_id, venue_id order by arrived_at) > interval '10 min'
              then 1 else 0 end
          ) over (partition by profile_id, venue_id order by arrived_at)          as grp
    from v
  ), stays as (
    /* pick first & last ping of each contiguous group */
    select
      profile_id,
      venue_id,
      min(arrived_at)                   as arrived_at,
      max(arrived_at)                   as departed_at,
      avg(distance_m)::int             as distance_m
    from groups
    group by profile_id, venue_id, grp
  )
  insert into public.venue_stays (profile_id, venue_id, arrived_at, departed_at, distance_m)
  select *
  from   stays
  on conflict do nothing;

  get diagnostics merged = row_count;
  return merged;
end $function$"
"-- Function 145: public.merge_visits_into_stays
-- Drop statement:
DROP FUNCTION IF EXISTS public.merge_visits_into_stays CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.merge_visits_into_stays(_lookback interval DEFAULT '00:15:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  merged int := 0;
begin
  /* “raw” visits in the look-back window */
  with v as (
    select *
    from   public.venue_visits
    where  arrived_at >= now() - _lookback
  ), groups as (
    /* rank contiguous pings per user & venue (gap <10 min) */
    select
      v.*,
      lag(arrived_at) over (partition by profile_id, venue_id order by arrived_at) as prev_ts,
      sum( case
              when lag(arrived_at) over (partition by profile_id, venue_id order by arrived_at)
                   is null
                   or arrived_at - lag(arrived_at) over (partition by profile_id, venue_id order by arrived_at) > interval '10 min'
              then 1 else 0 end
          ) over (partition by profile_id, venue_id order by arrived_at)          as grp
    from v
  ), stays as (
    /* pick first & last ping of each contiguous group */
    select
      profile_id,
      venue_id,
      min(arrived_at)                   as arrived_at,
      max(arrived_at)                   as departed_at,
      avg(distance_m)::int             as distance_m
    from groups
    group by profile_id, venue_id, grp
  )
  insert into public.venue_stays (profile_id, venue_id, arrived_at, departed_at, distance_m)
  select *
  from   stays
  on conflict do nothing;

  get diagnostics merged = row_count;
  return merged;
end $function$"
"-- Function 58: public.migrate_rls_policies_user_id_to_profile_id
-- Drop statement:
DROP FUNCTION IF EXISTS public.migrate_rls_policies_user_id_to_profile_id CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.migrate_rls_policies_profile_id_to_profile_id()
 RETURNS TABLE(policy_name text, table_name text, status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    pol   record;
    new_using text;
    new_check text;
    success_count int := 0;
    error_count int := 0;
    policy_count int := 0;
    result_status text;
BEGIN
    -- Count total policies that need updating
    SELECT COUNT(*) INTO policy_count
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND (   qual ILIKE '%profile_id%'
           OR qual ILIKE '%invitee_profile_id%'
           OR COALESCE(with_check,'') ILIKE '%profile_id%'
           OR COALESCE(with_check,'') ILIKE '%invitee_profile_id%' );
           
    RAISE NOTICE 'Found % policies to update', policy_count;

    FOR pol IN
        SELECT schemaname,
               tablename,
               policyname,
               cmd,
               qual,
               with_check
        FROM   pg_policies
        WHERE  schemaname = 'public'
          AND (   qual ILIKE '%profile_id%'
               OR qual ILIKE '%invitee_profile_id%'
               OR COALESCE(with_check,'') ILIKE '%profile_id%'
               OR COALESCE(with_check,'') ILIKE '%invitee_profile_id%' )
    LOOP
        -- replace column names in USING and CHECK clauses
        new_using := pol.qual;
        new_check := pol.with_check;

        IF new_using IS NOT NULL THEN
            new_using := regexp_replace(
                            regexp_replace(new_using,
                                           '\binvitee_profile_id\b',
                                           'invitee_profile_id',
                                           'gi'),
                            '\buser_id\b',
                            'profile_id',
                            'gi');
        END IF;

        IF new_check IS NOT NULL THEN
            new_check := regexp_replace(
                            regexp_replace(new_check,
                                           '\binvitee_profile_id\b',
                                           'invitee_profile_id',
                                           'gi'),
                            '\buser_id\b',
                            'profile_id',
                            'gi');
        END IF;

        -- fallback defaults
        BEGIN
            IF pol.cmd IN ('SELECT','DELETE') THEN
                IF new_using IS NULL OR trim(new_using) = '' THEN
                    new_using := 'TRUE';
                END IF;

                EXECUTE format(
                    'ALTER POLICY %I ON public.%I USING (%s);',
                    pol.policyname,
                    pol.tablename,
                    new_using);

            ELSIF pol.cmd = 'INSERT' THEN
                IF new_check IS NULL OR trim(new_check) = '' THEN
                    new_check := 'TRUE';
                END IF;

                EXECUTE format(
                    'ALTER POLICY %I ON public.%I WITH CHECK (%s);',
                    pol.policyname,
                    pol.tablename,
                    new_check);

            ELSE -- UPDATE or ALL
                IF new_using IS NULL OR trim(new_using) = '' THEN
                    new_using := 'TRUE';
                END IF;
                IF new_check IS NULL OR trim(new_check) = '' THEN
                    new_check := new_using;
                END IF;

                EXECUTE format(
                    'ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s);',
                    pol.policyname,
                    pol.tablename,
                    new_using,
                    new_check);
            END IF;
            
            success_count := success_count + 1;
            result_status := 'SUCCESS';
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            result_status := 'ERROR: ' || SQLERRM;
        END;
        
        -- Return result for this policy
        policy_name := pol.policyname;
        table_name := pol.tablename;
        status := result_status;
        RETURN NEXT;
    END LOOP;
    
    -- Add summary row
    policy_name := 'SUMMARY';
    table_name := '';
    status := format('Total: %s, Success: %s, Error: %s', 
                    policy_count, success_count, error_count);
    RETURN NEXT;
    
    -- Verify if any policies still have profile_id references
    SELECT COUNT(*) INTO policy_count
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND (   qual ILIKE '%profile_id%'
           OR qual ILIKE '%invitee_profile_id%'
           OR COALESCE(with_check,'') ILIKE '%profile_id%'
           OR COALESCE(with_check,'') ILIKE '%invitee_profile_id%' );
           
    -- Add verification row
    policy_name := 'VERIFICATION';
    table_name := '';
    status := format('Remaining policies with profile_id: %s', policy_count);
    RETURN NEXT;
END;
$function$"
"-- Function 146: public.migrate_rls_policies_user_id_to_profile_id
-- Drop statement:
DROP FUNCTION IF EXISTS public.migrate_rls_policies_user_id_to_profile_id CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.migrate_rls_policies_profile_id_to_profile_id()
 RETURNS TABLE(policy_name text, table_name text, status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    pol   record;
    new_using text;
    new_check text;
    success_count int := 0;
    error_count int := 0;
    policy_count int := 0;
    result_status text;
BEGIN
    -- Count total policies that need updating
    SELECT COUNT(*) INTO policy_count
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND (   qual ILIKE '%profile_id%'
           OR qual ILIKE '%invitee_profile_id%'
           OR COALESCE(with_check,'') ILIKE '%profile_id%'
           OR COALESCE(with_check,'') ILIKE '%invitee_profile_id%' );
           
    RAISE NOTICE 'Found % policies to update', policy_count;

    FOR pol IN
        SELECT schemaname,
               tablename,
               policyname,
               cmd,
               qual,
               with_check
        FROM   pg_policies
        WHERE  schemaname = 'public'
          AND (   qual ILIKE '%profile_id%'
               OR qual ILIKE '%invitee_profile_id%'
               OR COALESCE(with_check,'') ILIKE '%profile_id%'
               OR COALESCE(with_check,'') ILIKE '%invitee_profile_id%' )
    LOOP
        -- replace column names in USING and CHECK clauses
        new_using := pol.qual;
        new_check := pol.with_check;

        IF new_using IS NOT NULL THEN
            new_using := regexp_replace(
                            regexp_replace(new_using,
                                           '\binvitee_profile_id\b',
                                           'invitee_profile_id',
                                           'gi'),
                            '\buser_id\b',
                            'profile_id',
                            'gi');
        END IF;

        IF new_check IS NOT NULL THEN
            new_check := regexp_replace(
                            regexp_replace(new_check,
                                           '\binvitee_profile_id\b',
                                           'invitee_profile_id',
                                           'gi'),
                            '\buser_id\b',
                            'profile_id',
                            'gi');
        END IF;

        -- fallback defaults
        BEGIN
            IF pol.cmd IN ('SELECT','DELETE') THEN
                IF new_using IS NULL OR trim(new_using) = '' THEN
                    new_using := 'TRUE';
                END IF;

                EXECUTE format(
                    'ALTER POLICY %I ON public.%I USING (%s);',
                    pol.policyname,
                    pol.tablename,
                    new_using);

            ELSIF pol.cmd = 'INSERT' THEN
                IF new_check IS NULL OR trim(new_check) = '' THEN
                    new_check := 'TRUE';
                END IF;

                EXECUTE format(
                    'ALTER POLICY %I ON public.%I WITH CHECK (%s);',
                    pol.policyname,
                    pol.tablename,
                    new_check);

            ELSE -- UPDATE or ALL
                IF new_using IS NULL OR trim(new_using) = '' THEN
                    new_using := 'TRUE';
                END IF;
                IF new_check IS NULL OR trim(new_check) = '' THEN
                    new_check := new_using;
                END IF;

                EXECUTE format(
                    'ALTER POLICY %I ON public.%I USING (%s) WITH CHECK (%s);',
                    pol.policyname,
                    pol.tablename,
                    new_using,
                    new_check);
            END IF;
            
            success_count := success_count + 1;
            result_status := 'SUCCESS';
            
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            result_status := 'ERROR: ' || SQLERRM;
        END;
        
        -- Return result for this policy
        policy_name := pol.policyname;
        table_name := pol.tablename;
        status := result_status;
        RETURN NEXT;
    END LOOP;
    
    -- Add summary row
    policy_name := 'SUMMARY';
    table_name := '';
    status := format('Total: %s, Success: %s, Error: %s', 
                    policy_count, success_count, error_count);
    RETURN NEXT;
    
    -- Verify if any policies still have profile_id references
    SELECT COUNT(*) INTO policy_count
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND (   qual ILIKE '%profile_id%'
           OR qual ILIKE '%invitee_profile_id%'
           OR COALESCE(with_check,'') ILIKE '%profile_id%'
           OR COALESCE(with_check,'') ILIKE '%invitee_profile_id%' );
           
    -- Add verification row
    policy_name := 'VERIFICATION';
    table_name := '';
    status := format('Remaining policies with profile_id: %s', policy_count);
    RETURN NEXT;
END;
$function$"
"-- Function 147: public.notify_my_floqs_participate
-- Drop statement:
DROP FUNCTION IF EXISTS public.notify_my_floqs_participate CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.notify_my_floqs_participate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_notify(
    format('user_floqs:%s', COALESCE(OLD.profile_id, NEW.profile_id)),
    json_build_object(
      'event', CASE WHEN TG_OP = 'INSERT' THEN 'joined' ELSE 'left' END,
      'floq_id', COALESCE(OLD.floq_id, NEW.floq_id)
    )::text
  );
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
END;
$function$"
"-- Function 59: public.notify_my_floqs_participate
-- Drop statement:
DROP FUNCTION IF EXISTS public.notify_my_floqs_participate CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.notify_my_floqs_participate()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM pg_notify(
    format('user_floqs:%s', COALESCE(OLD.profile_id, NEW.profile_id)),
    json_build_object(
      'event', CASE WHEN TG_OP = 'INSERT' THEN 'joined' ELSE 'left' END,
      'floq_id', COALESCE(OLD.floq_id, NEW.floq_id)
    )::text
  );
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
END;
$function$"
"-- Function 60: public.notify_plan_rsvp
-- Drop statement:
DROP FUNCTION IF EXISTS public.notify_plan_rsvp CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.notify_plan_rsvp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_record RECORD;
BEGIN
  -- Get plan and floq details
  SELECT
    fp.title AS plan_title,
    fp.creator_id,
    f.title AS floq_title
  INTO plan_record
  FROM public.floq_plans fp
  JOIN public.floqs f ON f.id = fp.floq_id
  WHERE fp.id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- Queue notification for plan creator
  IF plan_record.creator_id IS NOT NULL THEN
    INSERT INTO public.notification_queue (profile_id, event_type, payload)
    VALUES (
      plan_record.creator_id,
      'plan_rsvp',
      jsonb_build_object(
        'plan_id', COALESCE(NEW.plan_id, OLD.plan_id),
        'plan_title', plan_record.plan_title,
        'floq_title', plan_record.floq_title,
        'profile_id', COALESCE(NEW.profile_id, OLD.profile_id),
        'action', CASE WHEN TG_OP = 'INSERT' THEN 'joined' ELSE 'left' END
      )
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
END;
$function$"
"-- Function 150: public.notify_plan_rsvp
-- Drop statement:
DROP FUNCTION IF EXISTS public.notify_plan_rsvp CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.notify_plan_rsvp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  plan_record RECORD;
BEGIN
  -- Get plan and floq details
  SELECT
    fp.title AS plan_title,
    fp.creator_id,
    f.title AS floq_title
  INTO plan_record
  FROM public.floq_plans fp
  JOIN public.floqs f ON f.id = fp.floq_id
  WHERE fp.id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- Queue notification for plan creator
  IF plan_record.creator_id IS NOT NULL THEN
    INSERT INTO public.notification_queue (profile_id, event_type, payload)
    VALUES (
      plan_record.creator_id,
      'plan_rsvp',
      jsonb_build_object(
        'plan_id', COALESCE(NEW.plan_id, OLD.plan_id),
        'plan_title', plan_record.plan_title,
        'floq_title', plan_record.floq_title,
        'profile_id', COALESCE(NEW.profile_id, OLD.profile_id),
        'action', CASE WHEN TG_OP = 'INSERT' THEN 'joined' ELSE 'left' END
      )
    );
  END IF;
  
  RETURN CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
END;
$function$"
"-- Function 151: public.parse_mentions
-- Drop statement:
DROP FUNCTION IF EXISTS public.parse_mentions CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.parse_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  mention_text text;
  username_part text;
  mentioned_profile_id uuid;
BEGIN
  -- Clear existing mentions for this message
  DELETE FROM floq_message_mentions WHERE message_id = NEW.id;
  
  -- Extract mentions from message body using regexp_split_to_array
  FOR mention_text IN 
    SELECT unnest(regexp_split_to_array(NEW.body, '\s+'))
  LOOP
    -- Check if this word is a mention (starts with @)
    IF mention_text LIKE '@%' AND length(mention_text) > 1 THEN
      -- Extract username (remove @ prefix)
      username_part := substring(mention_text from 2);
      
      -- Find the user by username
      SELECT id INTO mentioned_profile_id 
      FROM profiles 
      WHERE username = username_part;
      
      -- If user found, insert mention record
      IF mentioned_profile_id IS NOT NULL THEN
        INSERT INTO floq_message_mentions (message_id, mentioned_profile_id)
        VALUES (NEW.id, mentioned_profile_id)
        ON CONFLICT (message_id, mentioned_profile_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$"
"-- Function 61: public.parse_mentions
-- Drop statement:
DROP FUNCTION IF EXISTS public.parse_mentions CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.parse_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  mention_text text;
  username_part text;
  mentioned_profile_id uuid;
BEGIN
  -- Clear existing mentions for this message
  DELETE FROM floq_message_mentions WHERE message_id = NEW.id;
  
  -- Extract mentions from message body using regexp_split_to_array
  FOR mention_text IN 
    SELECT unnest(regexp_split_to_array(NEW.body, '\s+'))
  LOOP
    -- Check if this word is a mention (starts with @)
    IF mention_text LIKE '@%' AND length(mention_text) > 1 THEN
      -- Extract username (remove @ prefix)
      username_part := substring(mention_text from 2);
      
      -- Find the user by username
      SELECT id INTO mentioned_profile_id 
      FROM profiles 
      WHERE username = username_part;
      
      -- If user found, insert mention record
      IF mentioned_profile_id IS NOT NULL THEN
        INSERT INTO floq_message_mentions (message_id, mentioned_profile_id)
        VALUES (NEW.id, mentioned_profile_id)
        ON CONFLICT (message_id, mentioned_profile_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$"
"-- Function 62: public.people_crossed_paths_today
-- Drop statement:
DROP FUNCTION IF EXISTS public.people_crossed_paths_today CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(in_me uuid, proximity_meters numeric DEFAULT 20)
 RETURNS TABLE(profile_id uuid, username text, display_name text, avatar_url text, last_seen_ts timestamp with time zone, last_seen_vibe vibe_enum, venue_name text, distance_meters numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_latest_location AS (
    SELECT 
      vl.location::geography AS geog,
      vl.ts AS my_ts
    FROM public.vibes_log vl
    WHERE vl.profile_id = in_me
      AND vl.ts >= CURRENT_DATE
    ORDER BY vl.ts DESC
    LIMIT 1
  ),
  
  bounding_box_filter AS (
    SELECT DISTINCT vl.profile_id
    FROM public.vibes_log vl
    CROSS JOIN my_latest_location mll
    WHERE vl.ts >= CURRENT_DATE
      AND vl.profile_id != in_me
      AND ST_DWithin(
        vl.location::geography,
        mll.geog,
        proximity_meters * 1.5
      )
  ),
  
  latest_points AS (
    SELECT DISTINCT ON (vl.profile_id)
      vl.profile_id,
      vl.ts,
      vl.location::geography AS geog,
      vl.vibe,
      vl.venue_id
    FROM public.vibes_log vl
    CROSS JOIN my_latest_location mll
    INNER JOIN bounding_box_filter bbf ON bbf.profile_id = vl.profile_id
    WHERE vl.ts >= CURRENT_DATE
      AND ST_DWithin(
        vl.location::geography,
        mll.geog,
        proximity_meters
      )
      -- Temporal overlap: their latest point vs our journey
      AND EXISTS (
        SELECT 1 FROM public.vibes_log vl2
        WHERE vl2.profile_id = in_me
          AND vl2.ts >= CURRENT_DATE
          AND vl2.ts BETWEEN vl.ts - INTERVAL '30 minutes' 
                        AND vl.ts + INTERVAL '30 minutes'
      )
    ORDER BY vl.profile_id, vl.ts DESC
  ),
  
  excluded_friends AS (
    SELECT f.friend_id AS profile_id FROM public.friendships f WHERE f.profile_id = in_me
    UNION
    SELECT f.profile_id FROM public.friendships f WHERE f.friend_id = in_me
    UNION  
    SELECT fr.friend_id AS profile_id FROM public.friend_requests fr 
    WHERE fr.profile_id = in_me AND fr.status = 'accepted'
    UNION
    SELECT fr.profile_id FROM public.friend_requests fr 
    WHERE fr.friend_id = in_me AND fr.status = 'accepted'
  )
  
  SELECT 
    lp.profile_id,
    p.username,
    p.display_name,
    p.avatar_url,
    lp.ts AS last_seen_ts,
    lp.vibe AS last_seen_vibe,
    v.name AS venue_name,
    ROUND(ST_Distance(lp.geog, mll.geog)::numeric, 1) AS distance_meters
  FROM latest_points lp
  CROSS JOIN my_latest_location mll
  LEFT JOIN public.profiles p ON p.id = lp.profile_id
  LEFT JOIN public.venues v ON v.id = lp.venue_id
  WHERE NOT EXISTS (
    SELECT 1 FROM excluded_friends ef WHERE ef.profile_id = lp.profile_id
  )
  ORDER BY distance_meters ASC, lp.ts DESC
  LIMIT 50;
$function$"
"-- Function 152: public.people_crossed_paths_today
-- Drop statement:
DROP FUNCTION IF EXISTS public.people_crossed_paths_today CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(in_me uuid, proximity_meters numeric DEFAULT 20)
 RETURNS TABLE(profile_id uuid, username text, display_name text, avatar_url text, last_seen_ts timestamp with time zone, last_seen_vibe vibe_enum, venue_name text, distance_meters numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_latest_location AS (
    SELECT 
      vl.location::geography AS geog,
      vl.ts AS my_ts
    FROM public.vibes_log vl
    WHERE vl.profile_id = in_me
      AND vl.ts >= CURRENT_DATE
    ORDER BY vl.ts DESC
    LIMIT 1
  ),
  
  bounding_box_filter AS (
    SELECT DISTINCT vl.profile_id
    FROM public.vibes_log vl
    CROSS JOIN my_latest_location mll
    WHERE vl.ts >= CURRENT_DATE
      AND vl.profile_id != in_me
      AND ST_DWithin(
        vl.location::geography,
        mll.geog,
        proximity_meters * 1.5
      )
  ),
  
  latest_points AS (
    SELECT DISTINCT ON (vl.profile_id)
      vl.profile_id,
      vl.ts,
      vl.location::geography AS geog,
      vl.vibe,
      vl.venue_id
    FROM public.vibes_log vl
    CROSS JOIN my_latest_location mll
    INNER JOIN bounding_box_filter bbf ON bbf.profile_id = vl.profile_id
    WHERE vl.ts >= CURRENT_DATE
      AND ST_DWithin(
        vl.location::geography,
        mll.geog,
        proximity_meters
      )
      -- Temporal overlap: their latest point vs our journey
      AND EXISTS (
        SELECT 1 FROM public.vibes_log vl2
        WHERE vl2.profile_id = in_me
          AND vl2.ts >= CURRENT_DATE
          AND vl2.ts BETWEEN vl.ts - INTERVAL '30 minutes' 
                        AND vl.ts + INTERVAL '30 minutes'
      )
    ORDER BY vl.profile_id, vl.ts DESC
  ),
  
  excluded_friends AS (
    SELECT f.friend_id AS profile_id FROM public.friendships f WHERE f.profile_id = in_me
    UNION
    SELECT f.profile_id FROM public.friendships f WHERE f.friend_id = in_me
    UNION  
    SELECT fr.friend_id AS profile_id FROM public.friend_requests fr 
    WHERE fr.profile_id = in_me AND fr.status = 'accepted'
    UNION
    SELECT fr.profile_id FROM public.friend_requests fr 
    WHERE fr.friend_id = in_me AND fr.status = 'accepted'
  )
  
  SELECT 
    lp.profile_id,
    p.username,
    p.display_name,
    p.avatar_url,
    lp.ts AS last_seen_ts,
    lp.vibe AS last_seen_vibe,
    v.name AS venue_name,
    ROUND(ST_Distance(lp.geog, mll.geog)::numeric, 1) AS distance_meters
  FROM latest_points lp
  CROSS JOIN my_latest_location mll
  LEFT JOIN public.profiles p ON p.id = lp.profile_id
  LEFT JOIN public.venues v ON v.id = lp.venue_id
  WHERE NOT EXISTS (
    SELECT 1 FROM excluded_friends ef WHERE ef.profile_id = lp.profile_id
  )
  ORDER BY distance_meters ASC, lp.ts DESC
  LIMIT 50;
$function$"
"-- Function 153: public.presence_nearby
-- Drop statement:
DROP FUNCTION IF EXISTS public.presence_nearby CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.presence_nearby(lat numeric, lng numeric, km numeric, include_self boolean DEFAULT false)
 RETURNS SETOF vibes_now
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.vibes_now v
  WHERE ST_DWithin(
          v.geo,
          ST_MakePoint(lng, lat)::geography,
          km * 1000
        )
    AND v.expires_at > NOW()
    AND (include_self OR v.profile_id <> auth.uid())
    AND (
          COALESCE(v.visibility,'public') = 'public'
       OR (v.visibility = 'friends'
           AND EXISTS (
                 SELECT 1
                 FROM public.friendships f
                 WHERE (f.profile_id   = auth.uid() AND f.friend_id = v.profile_id)
                    OR (f.friend_id = auth.uid() AND f.profile_id   = v.profile_id)
               )
          )
        );
$function$"
"-- Function 63: public.presence_nearby
-- Drop statement:
DROP FUNCTION IF EXISTS public.presence_nearby CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.presence_nearby(lat numeric, lng numeric, km numeric, include_self boolean DEFAULT false)
 RETURNS SETOF vibes_now
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT *
  FROM public.vibes_now v
  WHERE ST_DWithin(
          v.geo,
          ST_MakePoint(lng, lat)::geography,
          km * 1000
        )
    AND v.expires_at > NOW()
    AND (include_self OR v.profile_id <> auth.uid())
    AND (
          COALESCE(v.visibility,'public') = 'public'
       OR (v.visibility = 'friends'
           AND EXISTS (
                 SELECT 1
                 FROM public.friendships f
                 WHERE (f.profile_id   = auth.uid() AND f.friend_id = v.profile_id)
                    OR (f.friend_id = auth.uid() AND f.profile_id   = v.profile_id)
               )
          )
        );
$function$"
"-- Function 154: public.print_pk_profile_statements
-- Drop statement:
DROP FUNCTION IF EXISTS public.print_pk_profile_statements CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.print_pk_profile_statements()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    r           record;
    col_list    text;
    new_cols    text;
    new_name    text;
BEGIN
FOR r IN
    SELECT  c.conrelid::regclass          AS table_name,
            c.conname                     AS constraint_name,
            c.contype                     AS contype,
            -- raw column list like “(profile_id, floq_id)”
            regexp_replace(pg_get_constraintdef(c.oid),
                           '.*\((.*)\).*', '\1')      AS col_list
    FROM    pg_constraint c
    WHERE   c.connamespace = 'public'::regnamespace
      AND   c.contype IN ('p','u')                    -- PK or UNIQUE
      AND   pg_get_constraintdef(c.oid) ILIKE '%profile_id%'
LOOP
    /* 1️⃣  build new column list with profile_id substitutions */
    col_list := r.col_list;
    new_cols := string_agg(
                  replace(trim(col), 'profile_id', 'profile_id'), ', ')
                FROM unnest(string_to_array(col_list, ',')) AS col;

    /* 2️⃣  derive a new constraint name (optional tweak) */
    new_name := replace(r.constraint_name, 'profile_id', 'profile_id');

    /* 3️⃣  print the three DDL lines */
    RAISE NOTICE E'\n-- %\nALTER TABLE % DROP CONSTRAINT IF EXISTS %;',
                 r.constraint_name, r.table_name, r.constraint_name;

    RAISE NOTICE 'DROP INDEX IF EXISTS %;', r.constraint_name;

    RAISE NOTICE 'ALTER TABLE % ADD CONSTRAINT % % (%);',
                 r.table_name,
                 new_name,
                 CASE WHEN r.contype = 'p' THEN 'PRIMARY KEY' ELSE 'UNIQUE' END,
                 new_cols;
END LOOP;
END;
$function$"
"-- Function 64: public.print_pk_profile_statements
-- Drop statement:
DROP FUNCTION IF EXISTS public.print_pk_profile_statements CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.print_pk_profile_statements()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    r           record;
    col_list    text;
    new_cols    text;
    new_name    text;
BEGIN
FOR r IN
    SELECT  c.conrelid::regclass          AS table_name,
            c.conname                     AS constraint_name,
            c.contype                     AS contype,
            -- raw column list like “(profile_id, floq_id)”
            regexp_replace(pg_get_constraintdef(c.oid),
                           '.*\((.*)\).*', '\1')      AS col_list
    FROM    pg_constraint c
    WHERE   c.connamespace = 'public'::regnamespace
      AND   c.contype IN ('p','u')                    -- PK or UNIQUE
      AND   pg_get_constraintdef(c.oid) ILIKE '%profile_id%'
LOOP
    /* 1️⃣  build new column list with profile_id substitutions */
    col_list := r.col_list;
    new_cols := string_agg(
                  replace(trim(col), 'profile_id', 'profile_id'), ', ')
                FROM unnest(string_to_array(col_list, ',')) AS col;

    /* 2️⃣  derive a new constraint name (optional tweak) */
    new_name := replace(r.constraint_name, 'profile_id', 'profile_id');

    /* 3️⃣  print the three DDL lines */
    RAISE NOTICE E'\n-- %\nALTER TABLE % DROP CONSTRAINT IF EXISTS %;',
                 r.constraint_name, r.table_name, r.constraint_name;

    RAISE NOTICE 'DROP INDEX IF EXISTS %;', r.constraint_name;

    RAISE NOTICE 'ALTER TABLE % ADD CONSTRAINT % % (%);',
                 r.table_name,
                 new_name,
                 CASE WHEN r.contype = 'p' THEN 'PRIMARY KEY' ELSE 'UNIQUE' END,
                 new_cols;
END LOOP;
END;
$function$"
"-- Function 155: public.process_function_definition
-- Drop statement:
DROP FUNCTION IF EXISTS public.process_function_definition CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.process_function_definition(function_oid oid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  func_def text;
  result text;
BEGIN
  -- Get the function definition
  func_def := pg_get_functiondef(function_oid);
  
  -- Replace parameter names (simple pattern)
  result := replace(func_def, 'profile_id ', 'user_id_profile ');
  
  -- Replace function body references (simple pattern)
  result := replace(result, ' profile_id ', ' profile_id ');
  result := replace(result, '(profile_id)', '(profile_id)');
  result := replace(result, ',profile_id,', ',profile_id,');
  result := replace(result, ',profile_id)', ',profile_id)');
  
  RETURN result;
END;
$function$"
"-- Function 65: public.process_function_definition
-- Drop statement:
DROP FUNCTION IF EXISTS public.process_function_definition CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.process_function_definition(function_oid oid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  func_def text;
  result text;
BEGIN
  -- Get the function definition
  func_def := pg_get_functiondef(function_oid);
  
  -- Replace parameter names (simple pattern)
  result := replace(func_def, 'profile_id ', 'user_id_profile ');
  
  -- Replace function body references (simple pattern)
  result := replace(result, ' profile_id ', ' profile_id ');
  result := replace(result, '(profile_id)', '(profile_id)');
  result := replace(result, ',profile_id,', ',profile_id,');
  result := replace(result, ',profile_id)', ',profile_id)');
  
  RETURN result;
END;
$function$"
"-- Function 157: public.refresh_field_tiles
-- Drop statement:
DROP FUNCTION IF EXISTS public.refresh_field_tiles CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.refresh_field_tiles()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.field_tiles as ft
        (tile_id,
         crowd_count,
         avg_vibe,
         active_floq_ids,
         updated_at)
  with live as (
      select
        geohash6,
        /* numeric hue degrees per vibe  */
        case vibe
          when 'chill'    then 198
          when 'hype'     then  29
          when 'social'   then 270
          when 'curious'  then  90
          when 'flowing'  then 162
          else 180
        end                                        as hue_deg,
        profile_id,
        updated_at
      from   public.vibes_now
      where  updated_at > now() - interval '15 minutes'
        and  geohash6 is not null
  ), aggregates as (
      select
        geohash6                                          as tile,
        count(*)                                          as crowd,
        -- circular mean of hue 0-360 → 0-1, fixed type casting
        (mod((atan2(avg(sin(radians(hue_deg))),
                   avg(cos(radians(hue_deg))))*180/pi() + 360)::numeric, 360::numeric) / 360)::double precision
                                                        as hue_norm
      from   live
      group  by geohash6
  ), floqs_per_tile as (
      select
        l.geohash6                                as tile,
        array_agg(distinct fp.floq_id)            as floqs
      from   live  l
      left   join public.floq_participants fp on fp.profile_id = l.profile_id
      left   join public.floqs f on f.id = fp.floq_id
                                and f.deleted_at is null
                                and f.ends_at    > now()
      group  by l.geohash6
  )
  select
    a.tile                           as tile_id,
    a.crowd                          as crowd_count,
    jsonb_build_object('h', a.hue_norm, 's', 0.7, 'l', 0.6)  as avg_vibe,
    coalesce(f.floqs, '{}')          as active_floq_ids,
    now()                            as updated_at
  from aggregates a
  left join floqs_per_tile f on f.tile = a.tile
  on conflict (tile_id) do update
     set crowd_count      = excluded.crowd_count,
         avg_vibe         = excluded.avg_vibe,
         active_floq_ids  = excluded.active_floq_ids,
         updated_at       = excluded.updated_at;
end;
$function$"
"-- Function 66: public.refresh_field_tiles
-- Drop statement:
DROP FUNCTION IF EXISTS public.refresh_field_tiles CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.refresh_field_tiles()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.field_tiles as ft
        (tile_id,
         crowd_count,
         avg_vibe,
         active_floq_ids,
         updated_at)
  with live as (
      select
        geohash6,
        /* numeric hue degrees per vibe  */
        case vibe
          when 'chill'    then 198
          when 'hype'     then  29
          when 'social'   then 270
          when 'curious'  then  90
          when 'flowing'  then 162
          else 180
        end                                        as hue_deg,
        profile_id,
        updated_at
      from   public.vibes_now
      where  updated_at > now() - interval '15 minutes'
        and  geohash6 is not null
  ), aggregates as (
      select
        geohash6                                          as tile,
        count(*)                                          as crowd,
        -- circular mean of hue 0-360 → 0-1, fixed type casting
        (mod((atan2(avg(sin(radians(hue_deg))),
                   avg(cos(radians(hue_deg))))*180/pi() + 360)::numeric, 360::numeric) / 360)::double precision
                                                        as hue_norm
      from   live
      group  by geohash6
  ), floqs_per_tile as (
      select
        l.geohash6                                as tile,
        array_agg(distinct fp.floq_id)            as floqs
      from   live  l
      left   join public.floq_participants fp on fp.profile_id = l.profile_id
      left   join public.floqs f on f.id = fp.floq_id
                                and f.deleted_at is null
                                and f.ends_at    > now()
      group  by l.geohash6
  )
  select
    a.tile                           as tile_id,
    a.crowd                          as crowd_count,
    jsonb_build_object('h', a.hue_norm, 's', 0.7, 'l', 0.6)  as avg_vibe,
    coalesce(f.floqs, '{}')          as active_floq_ids,
    now()                            as updated_at
  from aggregates a
  left join floqs_per_tile f on f.tile = a.tile
  on conflict (tile_id) do update
     set crowd_count      = excluded.crowd_count,
         avg_vibe         = excluded.avg_vibe,
         active_floq_ids  = excluded.active_floq_ids,
         updated_at       = excluded.updated_at;
end;
$function$"
"-- Function 67: public.refresh_friend_last_points
-- Drop statement:
DROP FUNCTION IF EXISTS public.refresh_friend_last_points CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.refresh_friend_last_points()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  /* example implementation – adapt as needed */
  insert into friend_last_points(profile_id, geom, captured_at)
  select rl.profile_id,
         rl.geom,
         rl.captured_at
  from   (
           select distinct on (profile_id) *
           from   raw_locations
           order  by profile_id, captured_at desc
         ) rl
  on conflict (profile_id) do update
    set geom        = excluded.geom,
        captured_at = excluded.captured_at;
end; $function$"
"-- Function 158: public.refresh_friend_last_points
-- Drop statement:
DROP FUNCTION IF EXISTS public.refresh_friend_last_points CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.refresh_friend_last_points()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  /* example implementation – adapt as needed */
  insert into friend_last_points(profile_id, geom, captured_at)
  select rl.profile_id,
         rl.geom,
         rl.captured_at
  from   (
           select distinct on (profile_id) *
           from   raw_locations
           order  by profile_id, captured_at desc
         ) rl
  on conflict (profile_id) do update
    set geom        = excluded.geom,
        captured_at = excluded.captured_at;
end; $function$"
"-- Function 68: public.reorder_plan_stops
-- Drop statement:
DROP FUNCTION IF EXISTS public.reorder_plan_stops CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.reorder_plan_stops(p_plan_id uuid, p_stop_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Access check: participant or floq member
  if not exists (
      select 1 from public.plan_participants
      where plan_id = p_plan_id and profile_id = auth.uid()
    )
    and not exists (
      select 1
      from public.floq_plans fp
      join public.floq_participants fpar
        on fpar.floq_id = fp.floq_id
      where fp.id = p_plan_id
        and fpar.profile_id = auth.uid()
    )
  then
    raise exception 'Access denied to plan %', p_plan_id;
  end if;

  -- Bulk update
  update public.plan_stops ps
  set    stop_order = v.stop_order
  from (
    select (elem->>'id')::uuid        as id,
           (elem->>'stop_order')::int as stop_order
    from   jsonb_array_elements(p_stop_orders) elem
  ) v
  where ps.id = v.id
    and ps.plan_id = p_plan_id;

  -- Touch plan.updated_at
  update public.floq_plans
  set    updated_at = now()
  where  id = p_plan_id;
end;
$function$"
"-- Function 159: public.reorder_plan_stops
-- Drop statement:
DROP FUNCTION IF EXISTS public.reorder_plan_stops CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.reorder_plan_stops(p_plan_id uuid, p_stop_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Access check: participant or floq member
  if not exists (
      select 1 from public.plan_participants
      where plan_id = p_plan_id and profile_id = auth.uid()
    )
    and not exists (
      select 1
      from public.floq_plans fp
      join public.floq_participants fpar
        on fpar.floq_id = fp.floq_id
      where fp.id = p_plan_id
        and fpar.profile_id = auth.uid()
    )
  then
    raise exception 'Access denied to plan %', p_plan_id;
  end if;

  -- Bulk update
  update public.plan_stops ps
  set    stop_order = v.stop_order
  from (
    select (elem->>'id')::uuid        as id,
           (elem->>'stop_order')::int as stop_order
    from   jsonb_array_elements(p_stop_orders) elem
  ) v
  where ps.id = v.id
    and ps.plan_id = p_plan_id;

  -- Touch plan.updated_at
  update public.floq_plans
  set    updated_at = now()
  where  id = p_plan_id;
end;
$function$"
"-- Function 69: public.replace_user_id_in_functions
-- Drop statement:
DROP FUNCTION IF EXISTS public.replace_user_id_in_functions CASCADE;

-- Create statement:
CREATE OR REPLACE PROCEDURE public.replace_profile_id_in_functions()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
  func_record record;
  func_def text;
  modified_def text;
  drop_statement text;
BEGIN
  -- Process each function
  FOR func_record IN 
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      p.oid AS function_oid
    FROM 
      pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE 
      (p.prosrc LIKE '%profile_id%' OR pg_get_function_arguments(p.oid) LIKE '%profile_id%')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY 
      n.nspname, 
      p.proname
  LOOP
    -- Get the function definition
    func_def := pg_get_functiondef(func_record.function_oid);
    
    -- Skip if it doesn't actually contain profile_id
    IF func_def NOT LIKE '%profile_id%' THEN
      CONTINUE;
    END IF;
    
    -- Store the original and modified definitions
    INSERT INTO function_replacements (
      schema_name, 
      function_name, 
      original_definition,
      modified_definition
    )
    VALUES (
      func_record.schema_name, 
      func_record.function_name, 
      func_def,
      NULL  -- We'll update this later
    );
  END LOOP;
END;
$procedure$"
"-- Function 160: public.replace_user_id_in_functions
-- Drop statement:
DROP FUNCTION IF EXISTS public.replace_user_id_in_functions CASCADE;

-- Create statement:
CREATE OR REPLACE PROCEDURE public.replace_profile_id_in_functions()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
  func_record record;
  func_def text;
  modified_def text;
  drop_statement text;
BEGIN
  -- Process each function
  FOR func_record IN 
    SELECT 
      n.nspname AS schema_name,
      p.proname AS function_name,
      p.oid AS function_oid
    FROM 
      pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE 
      (p.prosrc LIKE '%profile_id%' OR pg_get_function_arguments(p.oid) LIKE '%profile_id%')
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY 
      n.nspname, 
      p.proname
  LOOP
    -- Get the function definition
    func_def := pg_get_functiondef(func_record.function_oid);
    
    -- Skip if it doesn't actually contain profile_id
    IF func_def NOT LIKE '%profile_id%' THEN
      CONTINUE;
    END IF;
    
    -- Store the original and modified definitions
    INSERT INTO function_replacements (
      schema_name, 
      function_name, 
      original_definition,
      modified_definition
    )
    VALUES (
      func_record.schema_name, 
      func_record.function_name, 
      func_def,
      NULL  -- We'll update this later
    );
  END LOOP;
END;
$procedure$"
"-- Function 70: public.rewrite_user_id_to_profile_id
-- Drop statement:
DROP FUNCTION IF EXISTS public.rewrite_user_id_to_profile_id CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.rewrite_profile_id_to_profile_id(target_schema text DEFAULT 'public'::text, dry_run boolean DEFAULT false)
 RETURNS TABLE(schema_name text, function_name text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    func_rec RECORD;
    original_def TEXT;
    new_def TEXT;
    exec_result TEXT;
    rewritten_count INTEGER := 0;
    error_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- Loop through all functions in the target schema
    FOR func_rec IN
        SELECT n.nspname AS schema_name,
               p.proname AS function_name,
               p.oid AS function_oid,
               p.prokind
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = target_schema
          AND p.prokind IN ('f', 'p')  -- functions and procedures
          AND l.lanname IN ('plpgsql', 'sql')  -- skip C functions
          AND (
              pg_get_functiondef(p.oid) ILIKE '%profile_id%'
              OR pg_get_functiondef(p.oid) ILIKE '%invitee_profile_id%'
          )
        ORDER BY n.nspname, p.proname
    LOOP
        -- Get the original function definition
        original_def := pg_get_functiondef(func_rec.function_oid);
        
        -- Skip if no actual replacement needed (false positive in search)
        IF NOT (
            original_def ILIKE '%profile_id%' OR 
            original_def ILIKE '%invitee_profile_id%'
        ) THEN
            skipped_count := skipped_count + 1;
            schema_name := func_rec.schema_name;
            function_name := func_rec.function_name;
            status := 'SKIPPED: No replacements needed';
            RETURN NEXT;
            CONTINUE;
        END IF;
        
        -- Create the new definition with replacements
        -- First replace invitee_profile_id to avoid partial matches
        new_def := regexp_replace(
            original_def,
            '\binvitee_profile_id\b',
            'invitee_profile_id',
            'gi'
        );
        
        -- Then replace profile_id
        new_def := regexp_replace(
            new_def,
            '\buser_id\b',
            'profile_id',
            'gi'
        );
        
        -- Skip if no changes were made
        IF new_def = original_def THEN
            skipped_count := skipped_count + 1;
            schema_name := func_rec.schema_name;
            function_name := func_rec.function_name;
            status := 'SKIPPED: No changes after regex';
            RETURN NEXT;
            CONTINUE;
        END IF;
        
        -- Log the changes
        schema_name := func_rec.schema_name;
        function_name := func_rec.function_name;
        
        -- Execute the new function definition if not dry run
        IF NOT dry_run THEN
            BEGIN
                EXECUTE new_def;
                
                -- Log successful rewrite
                INSERT INTO function_rewrite_log (
                    schema_name, function_name, original_definition, new_definition
                ) VALUES (
                    func_rec.schema_name, func_rec.function_name, original_def, new_def
                );
                
                rewritten_count := rewritten_count + 1;
                status := 'SUCCESS: Function rewritten';
            EXCEPTION WHEN OTHERS THEN
                error_count := error_count + 1;
                status := 'ERROR: ' || SQLERRM;
            END;
        ELSE
            status := 'DRY RUN: Would rewrite function';
        END IF;
        
        RETURN NEXT;
    END LOOP;
    
    -- Final summary row
    schema_name := '---';
    function_name := '---';
    status := 'SUMMARY: ' || rewritten_count || ' rewritten, ' || 
              error_count || ' errors, ' || 
              skipped_count || ' skipped';
    RETURN NEXT;
END;
$function$"
"-- Function 161: public.rewrite_user_id_to_profile_id
-- Drop statement:
DROP FUNCTION IF EXISTS public.rewrite_user_id_to_profile_id CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.rewrite_profile_id_to_profile_id(target_schema text DEFAULT 'public'::text, dry_run boolean DEFAULT false)
 RETURNS TABLE(schema_name text, function_name text, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    func_rec RECORD;
    original_def TEXT;
    new_def TEXT;
    exec_result TEXT;
    rewritten_count INTEGER := 0;
    error_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- Loop through all functions in the target schema
    FOR func_rec IN
        SELECT n.nspname AS schema_name,
               p.proname AS function_name,
               p.oid AS function_oid,
               p.prokind
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = target_schema
          AND p.prokind IN ('f', 'p')  -- functions and procedures
          AND l.lanname IN ('plpgsql', 'sql')  -- skip C functions
          AND (
              pg_get_functiondef(p.oid) ILIKE '%profile_id%'
              OR pg_get_functiondef(p.oid) ILIKE '%invitee_profile_id%'
          )
        ORDER BY n.nspname, p.proname
    LOOP
        -- Get the original function definition
        original_def := pg_get_functiondef(func_rec.function_oid);
        
        -- Skip if no actual replacement needed (false positive in search)
        IF NOT (
            original_def ILIKE '%profile_id%' OR 
            original_def ILIKE '%invitee_profile_id%'
        ) THEN
            skipped_count := skipped_count + 1;
            schema_name := func_rec.schema_name;
            function_name := func_rec.function_name;
            status := 'SKIPPED: No replacements needed';
            RETURN NEXT;
            CONTINUE;
        END IF;
        
        -- Create the new definition with replacements
        -- First replace invitee_profile_id to avoid partial matches
        new_def := regexp_replace(
            original_def,
            '\binvitee_profile_id\b',
            'invitee_profile_id',
            'gi'
        );
        
        -- Then replace profile_id
        new_def := regexp_replace(
            new_def,
            '\buser_id\b',
            'profile_id',
            'gi'
        );
        
        -- Skip if no changes were made
        IF new_def = original_def THEN
            skipped_count := skipped_count + 1;
            schema_name := func_rec.schema_name;
            function_name := func_rec.function_name;
            status := 'SKIPPED: No changes after regex';
            RETURN NEXT;
            CONTINUE;
        END IF;
        
        -- Log the changes
        schema_name := func_rec.schema_name;
        function_name := func_rec.function_name;
        
        -- Execute the new function definition if not dry run
        IF NOT dry_run THEN
            BEGIN
                EXECUTE new_def;
                
                -- Log successful rewrite
                INSERT INTO function_rewrite_log (
                    schema_name, function_name, original_definition, new_definition
                ) VALUES (
                    func_rec.schema_name, func_rec.function_name, original_def, new_def
                );
                
                rewritten_count := rewritten_count + 1;
                status := 'SUCCESS: Function rewritten';
            EXCEPTION WHEN OTHERS THEN
                error_count := error_count + 1;
                status := 'ERROR: ' || SQLERRM;
            END;
        ELSE
            status := 'DRY RUN: Would rewrite function';
        END IF;
        
        RETURN NEXT;
    END LOOP;
    
    -- Final summary row
    schema_name := '---';
    function_name := '---';
    status := 'SUMMARY: ' || rewritten_count || ' rewritten, ' || 
              error_count || ' errors, ' || 
              skipped_count || ' skipped';
    RETURN NEXT;
END;
$function$"
"-- Function 162: public.search_afterglows
-- Drop statement:
DROP FUNCTION IF EXISTS public.search_afterglows CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.search_afterglows(p_profile_id uuid DEFAULT auth.uid(), p_search_query text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_min_energy integer DEFAULT NULL::integer, p_max_energy integer DEFAULT NULL::integer, p_dominant_vibe text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_is_pinned boolean DEFAULT NULL::boolean, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, date date, energy_score integer, social_intensity integer, dominant_vibe text, summary_text text, total_venues integer, total_floqs integer, crossed_paths_count integer, vibe_path text[], is_pinned boolean, moments_count bigint, created_at timestamp with time zone, search_rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN;                -- caller not authenticated  ➜ empty set
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT da.*,
           (SELECT count(*) FROM afterglow_moments am
            WHERE am.daily_afterglow_id = da.id)            AS moments_count,
           CASE
             WHEN p_search_query IS NULL THEN 1.0           -- neutral rank
             ELSE (
               ts_rank(to_tsvector('english', coalesce(da.summary_text,'')), plainto_tsquery('english', p_search_query)) * 0.8 +
               ts_rank(to_tsvector('english', coalesce(da.dominant_vibe,'')), plainto_tsquery('english', p_search_query)) * 0.2
             )
           END                                              AS search_rank
    FROM   daily_afterglow da
    WHERE  da.profile_id = p_profile_id
      AND  (p_start_date   IS NULL OR da.date >= p_start_date)
      AND  (p_end_date     IS NULL OR da.date <= p_end_date)
      AND  (p_min_energy   IS NULL OR da.energy_score      >= p_min_energy)
      AND  (p_max_energy   IS NULL OR da.energy_score      <= p_max_energy)
      AND  (p_dominant_vibe IS NULL OR da.dominant_vibe   =  p_dominant_vibe)
      AND  (p_is_pinned    IS NULL OR da.is_pinned        =  p_is_pinned)
      AND  (
             p_search_query IS NULL OR
             (
               to_tsvector('english', coalesce(da.summary_text,'')) @@ plainto_tsquery('english', p_search_query) OR
               to_tsvector('english', coalesce(da.dominant_vibe,'')) @@ plainto_tsquery('english', p_search_query)
             )
           )
      AND  (p_tags IS NULL OR p_tags && da.vibe_path)
  )
  SELECT *
  FROM   base
  ORDER  BY search_rank DESC, date DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$function$"
"-- Function 71: public.search_afterglows
-- Drop statement:
DROP FUNCTION IF EXISTS public.search_afterglows CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.search_afterglows(p_profile_id uuid DEFAULT auth.uid(), p_search_query text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date, p_min_energy integer DEFAULT NULL::integer, p_max_energy integer DEFAULT NULL::integer, p_dominant_vibe text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_is_pinned boolean DEFAULT NULL::boolean, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, date date, energy_score integer, social_intensity integer, dominant_vibe text, summary_text text, total_venues integer, total_floqs integer, crossed_paths_count integer, vibe_path text[], is_pinned boolean, moments_count bigint, created_at timestamp with time zone, search_rank real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN;                -- caller not authenticated  ➜ empty set
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT da.*,
           (SELECT count(*) FROM afterglow_moments am
            WHERE am.daily_afterglow_id = da.id)            AS moments_count,
           CASE
             WHEN p_search_query IS NULL THEN 1.0           -- neutral rank
             ELSE (
               ts_rank(to_tsvector('english', coalesce(da.summary_text,'')), plainto_tsquery('english', p_search_query)) * 0.8 +
               ts_rank(to_tsvector('english', coalesce(da.dominant_vibe,'')), plainto_tsquery('english', p_search_query)) * 0.2
             )
           END                                              AS search_rank
    FROM   daily_afterglow da
    WHERE  da.profile_id = p_profile_id
      AND  (p_start_date   IS NULL OR da.date >= p_start_date)
      AND  (p_end_date     IS NULL OR da.date <= p_end_date)
      AND  (p_min_energy   IS NULL OR da.energy_score      >= p_min_energy)
      AND  (p_max_energy   IS NULL OR da.energy_score      <= p_max_energy)
      AND  (p_dominant_vibe IS NULL OR da.dominant_vibe   =  p_dominant_vibe)
      AND  (p_is_pinned    IS NULL OR da.is_pinned        =  p_is_pinned)
      AND  (
             p_search_query IS NULL OR
             (
               to_tsvector('english', coalesce(da.summary_text,'')) @@ plainto_tsquery('english', p_search_query) OR
               to_tsvector('english', coalesce(da.dominant_vibe,'')) @@ plainto_tsquery('english', p_search_query)
             )
           )
      AND  (p_tags IS NULL OR p_tags && da.vibe_path)
  )
  SELECT *
  FROM   base
  ORDER  BY search_rank DESC, date DESC
  LIMIT  p_limit
  OFFSET p_offset;
END;
$function$"
"-- Function 72: public.search_floqs
-- Drop statement:
DROP FUNCTION IF EXISTS public.search_floqs CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.search_floqs(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 25, p_query text DEFAULT ''::text, p_vibe_ids vibe_enum[] DEFAULT '{}'::vibe_enum[], p_time_from timestamp with time zone DEFAULT now(), p_time_to timestamp with time zone DEFAULT (now() + '7 days'::interval), p_limit integer DEFAULT 100, p_visibilities text[] DEFAULT ARRAY['public'::text], _viewer_id uuid DEFAULT auth.uid())
 RETURNS TABLE(id uuid, title text, primary_vibe vibe_enum, starts_at timestamp with time zone, ends_at timestamp with time zone, distance_m double precision, participant_count bigint, friends_going_count integer, friends_going_avatars text[], friends_going_names text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Early exit for guest users (no friend data needed)
  IF _viewer_id IS NULL THEN
    RETURN QUERY
    WITH base_floqs AS (
      SELECT 
        f.id,
        f.title,
        f.primary_vibe,
        f.starts_at,
        f.ends_at,
        ST_Distance(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance_m
      FROM public.floqs f
      WHERE f.visibility = ANY(p_visibilities)
        AND f.deleted_at IS NULL
        AND ST_DWithin(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_km * 1000
        )
        -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
        AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
        AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
        -- Time window overlap logic
        AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
        AND f.starts_at <= p_time_to
    )
    SELECT 
      b.id,
      b.title,
      b.primary_vibe,
      b.starts_at,
      b.ends_at,
      b.distance_m,
      COALESCE(pc.participant_count, 0) AS participant_count,
      0 AS friends_going_count,
      ARRAY[]::text[] AS friends_going_avatars,
      ARRAY[]::text[] AS friends_going_names
    FROM base_floqs b
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = b.id
    ) pc ON true
    ORDER BY b.distance_m, pc.participant_count DESC, b.starts_at
    LIMIT p_limit;
    
    RETURN;
  END IF;

  -- Main query for authenticated users with friend data
  RETURN QUERY
  WITH base_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.primary_vibe,
      f.starts_at,
      f.ends_at,
      ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS distance_m
    FROM public.floqs f
    WHERE f.visibility = ANY(p_visibilities)
      AND f.deleted_at IS NULL
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
      AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
      -- Time window overlap logic
      AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
      AND f.starts_at <= p_time_to
  ),
  friends AS (
    SELECT CASE WHEN f.user_a = _viewer_id THEN f.user_b ELSE f.user_a END AS profile_id
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (_viewer_id IN (f.user_a, f.user_b))
  ),
  joined AS (
    SELECT 
      b.id AS floq_id,
      COUNT(fp.profile_id)::int AS cnt,
      (array_agg(p.avatar_url ORDER BY fp.joined_at DESC) FILTER (WHERE p.avatar_url IS NOT NULL))[1:4] AS avatars,
      (array_agg(p.display_name ORDER BY fp.joined_at DESC))[1:4] AS names
    FROM base_floqs b
    JOIN public.floq_participants fp ON fp.floq_id = b.id
    JOIN friends f ON f.profile_id = fp.profile_id
    JOIN public.profiles p ON p.id = fp.profile_id
    GROUP BY b.id
  )
  SELECT 
    b.id,
    b.title,
    b.primary_vibe,
    b.starts_at,
    b.ends_at,
    b.distance_m,
    COALESCE(pc.participant_count, 0) AS participant_count,
    COALESCE(j.cnt, 0) AS friends_going_count,
    COALESCE(j.avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(j.names, ARRAY[]::text[]) AS friends_going_names
  FROM base_floqs b
  LEFT JOIN joined j ON j.floq_id = b.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = b.id
  ) pc ON true
  ORDER BY b.distance_m, COALESCE(j.cnt, 0) DESC, pc.participant_count DESC
  LIMIT p_limit;
END;
$function$"
"-- Function 164: public.search_floqs
-- Drop statement:
DROP FUNCTION IF EXISTS public.search_floqs CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.search_floqs(p_lat double precision, p_lng double precision, p_radius_km double precision DEFAULT 25, p_query text DEFAULT ''::text, p_vibe_ids vibe_enum[] DEFAULT '{}'::vibe_enum[], p_time_from timestamp with time zone DEFAULT now(), p_time_to timestamp with time zone DEFAULT (now() + '7 days'::interval), p_limit integer DEFAULT 100, p_visibilities text[] DEFAULT ARRAY['public'::text], _viewer_id uuid DEFAULT auth.uid())
 RETURNS TABLE(id uuid, title text, primary_vibe vibe_enum, starts_at timestamp with time zone, ends_at timestamp with time zone, distance_m double precision, participant_count bigint, friends_going_count integer, friends_going_avatars text[], friends_going_names text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Early exit for guest users (no friend data needed)
  IF _viewer_id IS NULL THEN
    RETURN QUERY
    WITH base_floqs AS (
      SELECT 
        f.id,
        f.title,
        f.primary_vibe,
        f.starts_at,
        f.ends_at,
        ST_Distance(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance_m
      FROM public.floqs f
      WHERE f.visibility = ANY(p_visibilities)
        AND f.deleted_at IS NULL
        AND ST_DWithin(
          f.location::geography,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_km * 1000
        )
        -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
        AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
        AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
        -- Time window overlap logic
        AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
        AND f.starts_at <= p_time_to
    )
    SELECT 
      b.id,
      b.title,
      b.primary_vibe,
      b.starts_at,
      b.ends_at,
      b.distance_m,
      COALESCE(pc.participant_count, 0) AS participant_count,
      0 AS friends_going_count,
      ARRAY[]::text[] AS friends_going_avatars,
      ARRAY[]::text[] AS friends_going_names
    FROM base_floqs b
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM public.floq_participants fp
      WHERE fp.floq_id = b.id
    ) pc ON true
    ORDER BY b.distance_m, pc.participant_count DESC, b.starts_at
    LIMIT p_limit;
    
    RETURN;
  END IF;

  -- Main query for authenticated users with friend data
  RETURN QUERY
  WITH base_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.primary_vibe,
      f.starts_at,
      f.ends_at,
      ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) AS distance_m
    FROM public.floqs f
    WHERE f.visibility = ANY(p_visibilities)
      AND f.deleted_at IS NULL
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        p_radius_km * 1000
      )
      -- Handle empty vibe filter: ARRAY[]::vibe_enum[] is treated as "no filter"
      AND (cardinality(p_vibe_ids) = 0 OR f.primary_vibe = ANY(p_vibe_ids))
      AND (p_query = '' OR f.title ILIKE '%' || p_query || '%')
      -- Time window overlap logic
      AND COALESCE(f.ends_at, f.starts_at + interval '4 hours') >= p_time_from
      AND f.starts_at <= p_time_to
  ),
  friends AS (
    SELECT CASE WHEN f.user_a = _viewer_id THEN f.user_b ELSE f.user_a END AS profile_id
    FROM public.friends f
    WHERE f.status = 'accepted'
      AND (_viewer_id IN (f.user_a, f.user_b))
  ),
  joined AS (
    SELECT 
      b.id AS floq_id,
      COUNT(fp.profile_id)::int AS cnt,
      (array_agg(p.avatar_url ORDER BY fp.joined_at DESC) FILTER (WHERE p.avatar_url IS NOT NULL))[1:4] AS avatars,
      (array_agg(p.display_name ORDER BY fp.joined_at DESC))[1:4] AS names
    FROM base_floqs b
    JOIN public.floq_participants fp ON fp.floq_id = b.id
    JOIN friends f ON f.profile_id = fp.profile_id
    JOIN public.profiles p ON p.id = fp.profile_id
    GROUP BY b.id
  )
  SELECT 
    b.id,
    b.title,
    b.primary_vibe,
    b.starts_at,
    b.ends_at,
    b.distance_m,
    COALESCE(pc.participant_count, 0) AS participant_count,
    COALESCE(j.cnt, 0) AS friends_going_count,
    COALESCE(j.avatars, ARRAY[]::text[]) AS friends_going_avatars,
    COALESCE(j.names, ARRAY[]::text[]) AS friends_going_names
  FROM base_floqs b
  LEFT JOIN joined j ON j.floq_id = b.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = b.id
  ) pc ON true
  ORDER BY b.distance_m, COALESCE(j.cnt, 0) DESC, pc.participant_count DESC
  LIMIT p_limit;
END;
$function$"
"-- Function 73: public.search_users
-- Drop statement:
DROP FUNCTION IF EXISTS public.search_users CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.search_users(search_query text)
 RETURNS TABLE(id uuid, display_name text, avatar_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE length(trim(search_query)) >= 2
    AND lower(p.display_name) ILIKE '%' || lower(trim(search_query)) || '%'
    AND p.id <> auth.uid()
    AND p.display_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE (f.profile_id = auth.uid() AND f.friend_id = p.id)
         OR (f.friend_id = auth.uid() AND f.profile_id = p.id)
    )
  ORDER BY 
    -- Exact matches first, then prefix matches, then contains
    CASE 
      WHEN lower(p.display_name) = lower(trim(search_query)) THEN 1
      WHEN lower(p.display_name) ILIKE lower(trim(search_query)) || '%' THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 20;
$function$"
"-- Function 165: public.search_users
-- Drop statement:
DROP FUNCTION IF EXISTS public.search_users CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.search_users(search_query text)
 RETURNS TABLE(id uuid, display_name text, avatar_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.display_name, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE length(trim(search_query)) >= 2
    AND lower(p.display_name) ILIKE '%' || lower(trim(search_query)) || '%'
    AND p.id <> auth.uid()
    AND p.display_name IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE (f.profile_id = auth.uid() AND f.friend_id = p.id)
         OR (f.friend_id = auth.uid() AND f.profile_id = p.id)
    )
  ORDER BY 
    -- Exact matches first, then prefix matches, then contains
    CASE 
      WHEN lower(p.display_name) = lower(trim(search_query)) THEN 1
      WHEN lower(p.display_name) ILIKE lower(trim(search_query)) || '%' THEN 2
      ELSE 3
    END,
    p.display_name
  LIMIT 20;
$function$"
"-- Function 166: public.set_participant_role
-- Drop statement:
DROP FUNCTION IF EXISTS public.set_participant_role CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.set_participant_role(p_floq_id uuid, p_profile_id uuid, p_new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role text;
  target_user_role text;
  co_admin_count integer;
BEGIN
  -- Validate role
  IF p_new_role NOT IN ('member', 'co-admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be member or co-admin';
  END IF;

  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.profile_id = auth.uid();

  -- Check permissions
  IF current_user_role NOT IN ('creator', 'co-admin') THEN
    RAISE EXCEPTION 'Access denied: Only creators and co-admins can change roles';
  END IF;

  -- Get target user's current role
  SELECT role INTO target_user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.profile_id = p_profile_id;

  IF target_user_role IS NULL THEN
    RAISE EXCEPTION 'User is not a participant of this floq';
  END IF;

  -- Prevent demoting the creator
  IF target_user_role = 'creator' THEN
    RAISE EXCEPTION 'Cannot change the role of the floq creator';
  END IF;

  -- Prevent demoting the last co-admin
  IF p_new_role = 'member' AND target_user_role = 'co-admin' THEN
    SELECT COUNT(*) INTO co_admin_count
    FROM public.floq_participants 
    WHERE floq_id = p_floq_id AND role = 'co-admin';
    
    IF co_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last co-admin. Promote another member first.';
    END IF;
  END IF;

  -- Update the role
  UPDATE public.floq_participants
  SET role = p_new_role
  WHERE floq_id = p_floq_id AND profile_id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update participant role';
  END IF;
END;
$function$"
"-- Function 74: public.set_participant_role
-- Drop statement:
DROP FUNCTION IF EXISTS public.set_participant_role CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.set_participant_role(p_floq_id uuid, p_profile_id uuid, p_new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role text;
  target_user_role text;
  co_admin_count integer;
BEGIN
  -- Validate role
  IF p_new_role NOT IN ('member', 'co-admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be member or co-admin';
  END IF;

  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.profile_id = auth.uid();

  -- Check permissions
  IF current_user_role NOT IN ('creator', 'co-admin') THEN
    RAISE EXCEPTION 'Access denied: Only creators and co-admins can change roles';
  END IF;

  -- Get target user's current role
  SELECT role INTO target_user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.profile_id = p_profile_id;

  IF target_user_role IS NULL THEN
    RAISE EXCEPTION 'User is not a participant of this floq';
  END IF;

  -- Prevent demoting the creator
  IF target_user_role = 'creator' THEN
    RAISE EXCEPTION 'Cannot change the role of the floq creator';
  END IF;

  -- Prevent demoting the last co-admin
  IF p_new_role = 'member' AND target_user_role = 'co-admin' THEN
    SELECT COUNT(*) INTO co_admin_count
    FROM public.floq_participants 
    WHERE floq_id = p_floq_id AND role = 'co-admin';
    
    IF co_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last co-admin. Promote another member first.';
    END IF;
  END IF;

  -- Update the role
  UPDATE public.floq_participants
  SET role = p_new_role
  WHERE floq_id = p_floq_id AND profile_id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update participant role';
  END IF;
END;
$function$"
"-- Function 75: public.set_user_vibe
-- Drop statement:
DROP FUNCTION IF EXISTS public.set_user_vibe CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.set_user_vibe(new_vibe vibe_enum, lat double precision DEFAULT NULL::double precision, lng double precision DEFAULT NULL::double precision)
 RETURNS user_vibe_states
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_row user_vibe_states;
BEGIN
  WITH pt AS (
    SELECT CASE
             WHEN lat IS NULL OR lng IS NULL
                THEN (
                  SELECT location
                  FROM   public.user_vibe_states
                  WHERE  profile_id = auth.uid() AND active
                  LIMIT 1
                )
             ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
           END AS loc
  )
  INSERT INTO public.user_vibe_states (profile_id, vibe_tag, location, started_at, active)
  SELECT auth.uid(), new_vibe, loc, NOW(), TRUE
  FROM   pt
  ON CONFLICT (profile_id) DO UPDATE
    SET vibe_tag   = COALESCE(EXCLUDED.vibe_tag, user_vibe_states.vibe_tag),
        location   = COALESCE(EXCLUDED.location, user_vibe_states.location),
        started_at = CASE
                       WHEN user_vibe_states.vibe_tag <> EXCLUDED.vibe_tag
                       THEN NOW() ELSE user_vibe_states.started_at
                     END,
        active     = TRUE
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$function$"
"-- Function 167: public.set_user_vibe
-- Drop statement:
DROP FUNCTION IF EXISTS public.set_user_vibe CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.set_user_vibe(new_vibe vibe_enum, lat double precision DEFAULT NULL::double precision, lng double precision DEFAULT NULL::double precision)
 RETURNS user_vibe_states
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_row user_vibe_states;
BEGIN
  WITH pt AS (
    SELECT CASE
             WHEN lat IS NULL OR lng IS NULL
                THEN (
                  SELECT location
                  FROM   public.user_vibe_states
                  WHERE  profile_id = auth.uid() AND active
                  LIMIT 1
                )
             ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geometry
           END AS loc
  )
  INSERT INTO public.user_vibe_states (profile_id, vibe_tag, location, started_at, active)
  SELECT auth.uid(), new_vibe, loc, NOW(), TRUE
  FROM   pt
  ON CONFLICT (profile_id) DO UPDATE
    SET vibe_tag   = COALESCE(EXCLUDED.vibe_tag, user_vibe_states.vibe_tag),
        location   = COALESCE(EXCLUDED.location, user_vibe_states.location),
        started_at = CASE
                       WHEN user_vibe_states.vibe_tag <> EXCLUDED.vibe_tag
                       THEN NOW() ELSE user_vibe_states.started_at
                     END,
        active     = TRUE
  RETURNING * INTO result_row;

  RETURN result_row;
END;
$function$"
"-- Function 168: public.should_log_presence
-- Drop statement:
DROP FUNCTION IF EXISTS public.should_log_presence CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.should_log_presence(p_user uuid, p_loc geography, p_now timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _last_ts timestamptz;
  _last_loc geography;
BEGIN
  -- Most-recent row for *today* (avoids scanning large history)
  SELECT ts, location
    INTO _last_ts, _last_loc
    FROM public.vibes_log
   WHERE profile_id = p_user
     AND ts >= date_trunc('day', p_now)
   ORDER BY ts DESC
   LIMIT 1;

  -- First row today → log
  IF _last_ts IS NULL THEN
    RETURN true;
  END IF;

  -- 30-second cadence
  IF p_now - _last_ts >= interval '30 seconds' THEN
    RETURN true;
  END IF;

  -- 10-metre movement
  IF st_distance(_last_loc, p_loc) >= 10 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$"
"-- Function 76: public.should_log_presence
-- Drop statement:
DROP FUNCTION IF EXISTS public.should_log_presence CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.should_log_presence(p_user uuid, p_loc geography, p_now timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _last_ts timestamptz;
  _last_loc geography;
BEGIN
  -- Most-recent row for *today* (avoids scanning large history)
  SELECT ts, location
    INTO _last_ts, _last_loc
    FROM public.vibes_log
   WHERE profile_id = p_user
     AND ts >= date_trunc('day', p_now)
   ORDER BY ts DESC
   LIMIT 1;

  -- First row today → log
  IF _last_ts IS NULL THEN
    RETURN true;
  END IF;

  -- 30-second cadence
  IF p_now - _last_ts >= interval '30 seconds' THEN
    RETURN true;
  END IF;

  -- 10-metre movement
  IF st_distance(_last_loc, p_loc) >= 10 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$"
"-- Function 169: public.suggest_friends
-- Drop statement:
DROP FUNCTION IF EXISTS public.suggest_friends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.suggest_friends(p_profile_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, shared_tags integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  ------------------------------------------------------------------------
  -- 1 ▸ user_context – interests of the requesting user
  ------------------------------------------------------------------------
  WITH user_context AS (
    SELECT interests
    FROM   profiles
    WHERE  id = p_profile_id
  ),

  ------------------------------------------------------------------------
  -- 2 ▸ interest_matches – other users who share ≥1 tag
  ------------------------------------------------------------------------
  interest_matches AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      CARDINALITY(   -- number of overlapping tags
        ARRAY(
          SELECT unnest(p.interests)
          INTERSECT
          SELECT unnest(u.interests)
        )
      ) AS shared_tags
    FROM   profiles p
           CROSS JOIN user_context u
    WHERE  p.id <> p_profile_id
      AND  p.interests IS NOT NULL
      AND  u.interests IS NOT NULL
      AND  ARRAY_LENGTH(
            ARRAY(
              SELECT unnest(p.interests)
              INTERSECT
              SELECT unnest(u.interests)
            ), 1
          ) > 0
  ),

  ------------------------------------------------------------------------
  -- 3 ▸ fallback_pool – anyone except the current user, used when
  --     interest_matches is empty
  ------------------------------------------------------------------------
  fallback_pool AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      0 AS shared_tags
    FROM profiles p
    WHERE p.id <> p_profile_id
  )

  ------------------------------------------------------------------------
  -- 4 ▸ final result
  ------------------------------------------------------------------------
  SELECT *
  FROM (
    SELECT * FROM interest_matches
    UNION ALL
    SELECT * FROM fallback_pool
  ) t
  GROUP BY id, username, display_name, avatar_url, shared_tags
  ORDER BY shared_tags DESC, display_name
  LIMIT p_limit;
END;
$function$"
"-- Function 77: public.suggest_friends
-- Drop statement:
DROP FUNCTION IF EXISTS public.suggest_friends CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.suggest_friends(p_profile_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, shared_tags integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  ------------------------------------------------------------------------
  -- 1 ▸ user_context – interests of the requesting user
  ------------------------------------------------------------------------
  WITH user_context AS (
    SELECT interests
    FROM   profiles
    WHERE  id = p_profile_id
  ),

  ------------------------------------------------------------------------
  -- 2 ▸ interest_matches – other users who share ≥1 tag
  ------------------------------------------------------------------------
  interest_matches AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      CARDINALITY(   -- number of overlapping tags
        ARRAY(
          SELECT unnest(p.interests)
          INTERSECT
          SELECT unnest(u.interests)
        )
      ) AS shared_tags
    FROM   profiles p
           CROSS JOIN user_context u
    WHERE  p.id <> p_profile_id
      AND  p.interests IS NOT NULL
      AND  u.interests IS NOT NULL
      AND  ARRAY_LENGTH(
            ARRAY(
              SELECT unnest(p.interests)
              INTERSECT
              SELECT unnest(u.interests)
            ), 1
          ) > 0
  ),

  ------------------------------------------------------------------------
  -- 3 ▸ fallback_pool – anyone except the current user, used when
  --     interest_matches is empty
  ------------------------------------------------------------------------
  fallback_pool AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      0 AS shared_tags
    FROM profiles p
    WHERE p.id <> p_profile_id
  )

  ------------------------------------------------------------------------
  -- 4 ▸ final result
  ------------------------------------------------------------------------
  SELECT *
  FROM (
    SELECT * FROM interest_matches
    UNION ALL
    SELECT * FROM fallback_pool
  ) t
  GROUP BY id, username, display_name, avatar_url, shared_tags
  ORDER BY shared_tags DESC, display_name
  LIMIT p_limit;
END;
$function$"
"-- Function 170: public.tg_checkin_on_stay_insert
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_checkin_on_stay_insert CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_checkin_on_stay_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _stop  plan_stops%rowtype;
  _check uuid;
begin
  /* link the stay to its plan stop (venue + same local day) */
  select ps.* into _stop
  from   plan_stops ps
  where  ps.venue_id      = new.venue_id
    and  ps.start_time::date = new.arrived_at::date
    and  ps.plan_id in (          -- only plans the user is on
          select plan_id
          from   plan_participants
          where  profile_id = new.profile_id)
  limit 1;

  if found then
    new.plan_id := _stop.plan_id;
    new.stop_id := _stop.id;

    insert into plan_check_ins(plan_id, stop_id, profile_id, checked_in_at)
    values (_stop.plan_id, _stop.id, new.profile_id, new.arrived_at)
    on conflict do nothing;      -- idempotent

    perform pg_notify(
      'plan_checkin_ready',
      json_build_object(
        'plan_id', _stop.plan_id,
        'stop_id', _stop.id,
        'profile_id', new.profile_id,
        'arrived_at', new.arrived_at
      )::text
    );
  end if;

  /* broadcast to stop-list listener */
  perform pg_notify(
    'venue_stays_channel',
    json_build_object(
      'type',       'stay_insert',
      'id',         new.id,
      'profile_id',    new.profile_id,
      'venue_id',   new.venue_id,
      'arrived_at', new.arrived_at,
      'plan_id',    new.plan_id,
      'stop_id',    new.stop_id
    )::text
  );
  return new;
end;
$function$"
"-- Function 78: public.tg_checkin_on_stay_insert
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_checkin_on_stay_insert CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_checkin_on_stay_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _stop  plan_stops%rowtype;
  _check uuid;
begin
  /* link the stay to its plan stop (venue + same local day) */
  select ps.* into _stop
  from   plan_stops ps
  where  ps.venue_id      = new.venue_id
    and  ps.start_time::date = new.arrived_at::date
    and  ps.plan_id in (          -- only plans the user is on
          select plan_id
          from   plan_participants
          where  profile_id = new.profile_id)
  limit 1;

  if found then
    new.plan_id := _stop.plan_id;
    new.stop_id := _stop.id;

    insert into plan_check_ins(plan_id, stop_id, profile_id, checked_in_at)
    values (_stop.plan_id, _stop.id, new.profile_id, new.arrived_at)
    on conflict do nothing;      -- idempotent

    perform pg_notify(
      'plan_checkin_ready',
      json_build_object(
        'plan_id', _stop.plan_id,
        'stop_id', _stop.id,
        'profile_id', new.profile_id,
        'arrived_at', new.arrived_at
      )::text
    );
  end if;

  /* broadcast to stop-list listener */
  perform pg_notify(
    'venue_stays_channel',
    json_build_object(
      'type',       'stay_insert',
      'id',         new.id,
      'profile_id',    new.profile_id,
      'venue_id',   new.venue_id,
      'arrived_at', new.arrived_at,
      'plan_id',    new.plan_id,
      'stop_id',    new.stop_id
    )::text
  );
  return new;
end;
$function$"
"-- Function 79: public.tg_plan_checkin_notify
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_plan_checkin_notify CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_plan_checkin_notify()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.event_notifications (profile_id, kind, payload)
  SELECT pp.profile_id,
         'plan_checkin',
         jsonb_build_object(
           'plan_id',      NEW.plan_id,
           'profile_id',      NEW.profile_id,   -- JSON keeps legacy field name
           'stop_id',      NEW.stop_id
         )
  FROM public.plan_participants pp
  WHERE pp.plan_id      = NEW.plan_id
    AND pp.profile_id  <> NEW.profile_id;   -- exclude self

  RETURN NEW;
END;
$function$"
"-- Function 171: public.tg_plan_checkin_notify
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_plan_checkin_notify CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_plan_checkin_notify()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.event_notifications (profile_id, kind, payload)
  SELECT pp.profile_id,
         'plan_checkin',
         jsonb_build_object(
           'plan_id',      NEW.plan_id,
           'profile_id',      NEW.profile_id,   -- JSON keeps legacy field name
           'stop_id',      NEW.stop_id
         )
  FROM public.plan_participants pp
  WHERE pp.plan_id      = NEW.plan_id
    AND pp.profile_id  <> NEW.profile_id;   -- exclude self

  RETURN NEW;
END;
$function$"
"-- Function 80: public.tg_plan_comment_before
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_plan_comment_before CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_plan_comment_before()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();

  -- @handle extraction → profiles.username
  NEW.mentioned_users :=
    (
      SELECT COALESCE(array_agg(p.profile_id), '{}')
      FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{3,30})', 'g') AS m(handle TEXT)
      JOIN public.profiles p ON p.username = m.handle
    );

  RETURN NEW;
END;
$function$"
"-- Function 172: public.tg_plan_comment_before
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_plan_comment_before CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_plan_comment_before()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();

  -- @handle extraction → profiles.username
  NEW.mentioned_users :=
    (
      SELECT COALESCE(array_agg(p.profile_id), '{}')
      FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{3,30})', 'g') AS m(handle TEXT)
      JOIN public.profiles p ON p.username = m.handle
    );

  RETURN NEW;
END;
$function$"
"-- Function 81: public.tg_plan_comment_notify
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_plan_comment_notify CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_plan_comment_notify()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  recipient UUID;
BEGIN
  -- author’s own comment is excluded later
  FOR recipient IN
      SELECT DISTINCT u
      FROM unnest(COALESCE(NEW.mentioned_users, '{}')) AS u
      UNION
      SELECT creator_id
      FROM public.plans
      WHERE id = NEW.plan_id
  LOOP
    IF recipient = NEW.profile_id THEN CONTINUE; END IF;

    INSERT INTO public.event_notifications (profile_id, kind, payload)
    VALUES (
      recipient,
      'plan_comment_new',
      jsonb_build_object(
        'plan_id', NEW.plan_id,
        'comment_id', NEW.id,
        'author_id', NEW.profile_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$"
"-- Function 173: public.tg_plan_comment_notify
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_plan_comment_notify CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_plan_comment_notify()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  recipient UUID;
BEGIN
  -- author’s own comment is excluded later
  FOR recipient IN
      SELECT DISTINCT u
      FROM unnest(COALESCE(NEW.mentioned_users, '{}')) AS u
      UNION
      SELECT creator_id
      FROM public.plans
      WHERE id = NEW.plan_id
  LOOP
    IF recipient = NEW.profile_id THEN CONTINUE; END IF;

    INSERT INTO public.event_notifications (profile_id, kind, payload)
    VALUES (
      recipient,
      'plan_comment_new',
      jsonb_build_object(
        'plan_id', NEW.plan_id,
        'comment_id', NEW.id,
        'author_id', NEW.profile_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$"
"-- Function 82: public.tg_stay_update
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_stay_update CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_stay_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.departed_at is not null and old.departed_at is null then
    perform pg_notify(
      'venue_stays_channel',
      json_build_object(
        'type',        'stay_depart',
        'id',          new.id,
        'profile_id',     new.profile_id,
        'venue_id',    new.venue_id,
        'departed_at', new.departed_at,
        'plan_id',     new.plan_id,
        'stop_id',     new.stop_id
      )::text
    );
  end if;
  return new;
end;
$function$"
"-- Function 174: public.tg_stay_update
-- Drop statement:
DROP FUNCTION IF EXISTS public.tg_stay_update CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.tg_stay_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.departed_at is not null and old.departed_at is null then
    perform pg_notify(
      'venue_stays_channel',
      json_build_object(
        'type',        'stay_depart',
        'id',          new.id,
        'profile_id',     new.profile_id,
        'venue_id',    new.venue_id,
        'departed_at', new.departed_at,
        'plan_id',     new.plan_id,
        'stop_id',     new.stop_id
      )::text
    );
  end if;
  return new;
end;
$function$"
"-- Function 83: public.update_last_read_at
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_last_read_at CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_last_read_at(thread_id_param uuid, user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.direct_threads
  SET 
    last_read_at_a = CASE WHEN member_a = user_id_param THEN now() ELSE last_read_at_a END,
    last_read_at_b = CASE WHEN member_b = user_id_param THEN now() ELSE last_read_at_b END
  WHERE id = thread_id_param
    AND (member_a = user_id_param OR member_b = user_id_param);
  
  -- Notify UI to invalidate unread counts cache
  PERFORM pg_notify('dm_read_status', json_build_object(
    'thread_id', thread_id_param,
    'profile_id', user_id_param
  )::text);
END;
$function$"
"-- Function 175: public.update_last_read_at
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_last_read_at CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_last_read_at(thread_id_param uuid, user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.direct_threads
  SET 
    last_read_at_a = CASE WHEN member_a = user_id_param THEN now() ELSE last_read_at_a END,
    last_read_at_b = CASE WHEN member_b = user_id_param THEN now() ELSE last_read_at_b END
  WHERE id = thread_id_param
    AND (member_a = user_id_param OR member_b = user_id_param);
  
  -- Notify UI to invalidate unread counts cache
  PERFORM pg_notify('dm_read_status', json_build_object(
    'thread_id', thread_id_param,
    'profile_id', user_id_param
  )::text);
END;
$function$"
"-- Function 176: public.update_suggestion_metrics
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_suggestion_metrics CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_suggestion_metrics(p_profile_id uuid, p_suggestion_type suggestion_type_enum, p_action text, p_suggestion_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  metric_result jsonb;
BEGIN
  -- Validate action type
  IF p_action NOT IN ('generated', 'viewed', 'accepted', 'dismissed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action type');
  END IF;

  -- Update suggestion status if suggestion_id provided
  IF p_suggestion_id IS NOT NULL THEN
    UPDATE public.flock_auto_suggestions
    SET 
      status = CASE p_action
        WHEN 'accepted' THEN 'accepted'::suggestion_status_enum
        WHEN 'dismissed' THEN 'dismissed'::suggestion_status_enum
        ELSE status
      END,
      updated_at = now()
    WHERE id = p_suggestion_id AND profile_id = p_profile_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'suggestion_type', p_suggestion_type,
    'timestamp', now()
  );
END;
$function$"
"-- Function 84: public.update_suggestion_metrics
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_suggestion_metrics CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_suggestion_metrics(p_profile_id uuid, p_suggestion_type suggestion_type_enum, p_action text, p_suggestion_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  metric_result jsonb;
BEGIN
  -- Validate action type
  IF p_action NOT IN ('generated', 'viewed', 'accepted', 'dismissed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action type');
  END IF;

  -- Update suggestion status if suggestion_id provided
  IF p_suggestion_id IS NOT NULL THEN
    UPDATE public.flock_auto_suggestions
    SET 
      status = CASE p_action
        WHEN 'accepted' THEN 'accepted'::suggestion_status_enum
        WHEN 'dismissed' THEN 'dismissed'::suggestion_status_enum
        ELSE status
      END,
      updated_at = now()
    WHERE id = p_suggestion_id AND profile_id = p_profile_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'suggestion_type', p_suggestion_type,
    'timestamp', now()
  );
END;
$function$"
"-- Function 85: public.update_user_activity_tracking
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_user_activity_tracking CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(p_floq_id uuid, p_section text DEFAULT 'all'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_floq_activity_tracking (profile_id, floq_id)
  VALUES (auth.uid(), p_floq_id)
  ON CONFLICT (profile_id, floq_id) DO UPDATE
  SET last_chat_viewed_at = 
        CASE WHEN p_section IN ('all','chat') THEN now()
             ELSE EXCLUDED.last_chat_viewed_at END,
      last_activity_viewed_at = 
        CASE WHEN p_section IN ('all','activity') THEN now()
             ELSE EXCLUDED.last_activity_viewed_at END,
      last_plans_viewed_at = 
        CASE WHEN p_section IN ('all','plans') THEN now()
             ELSE EXCLUDED.last_plans_viewed_at END,
      updated_at = now();
  
  RETURN;
END;
$function$"
"-- Function 177: public.update_user_activity_tracking
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_user_activity_tracking CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_user_activity_tracking(p_floq_id uuid, p_section text DEFAULT 'all'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_floq_activity_tracking (profile_id, floq_id)
  VALUES (auth.uid(), p_floq_id)
  ON CONFLICT (profile_id, floq_id) DO UPDATE
  SET last_chat_viewed_at = 
        CASE WHEN p_section IN ('all','chat') THEN now()
             ELSE EXCLUDED.last_chat_viewed_at END,
      last_activity_viewed_at = 
        CASE WHEN p_section IN ('all','activity') THEN now()
             ELSE EXCLUDED.last_activity_viewed_at END,
      last_plans_viewed_at = 
        CASE WHEN p_section IN ('all','plans') THEN now()
             ELSE EXCLUDED.last_plans_viewed_at END,
      updated_at = now();
  
  RETURN;
END;
$function$"
"-- Function 178: public.update_user_preferences_from_feedback
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_user_preferences_from_feedback CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_user_preferences_from_feedback(p_profile_id uuid, p_vibe text, p_moment text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_preferences (profile_id, preferred_vibe, vibe_color)
  VALUES (
    p_profile_id,
    p_vibe,
    CASE p_vibe
      WHEN 'chill' THEN '#cfe8f5'
      WHEN 'energetic' THEN '#fef08a'
      WHEN 'romantic' THEN '#fce7f3'
      WHEN 'wild' THEN '#e9d5ff'
      WHEN 'cozy' THEN '#fed7d7'
      WHEN 'deep' THEN '#ccfbf1'
      ELSE '#e5e7eb'
    END
  )
  ON CONFLICT (profile_id)
  DO UPDATE SET
    preferred_vibe = EXCLUDED.preferred_vibe,
    vibe_color = EXCLUDED.vibe_color,
    feedback_sentiment = user_preferences.feedback_sentiment || jsonb_build_object('latest_moment', p_moment),
    updated_at = now();
END;
$function$"
"-- Function 86: public.update_user_preferences_from_feedback
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_user_preferences_from_feedback CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_user_preferences_from_feedback(p_profile_id uuid, p_vibe text, p_moment text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_preferences (profile_id, preferred_vibe, vibe_color)
  VALUES (
    p_profile_id,
    p_vibe,
    CASE p_vibe
      WHEN 'chill' THEN '#cfe8f5'
      WHEN 'energetic' THEN '#fef08a'
      WHEN 'romantic' THEN '#fce7f3'
      WHEN 'wild' THEN '#e9d5ff'
      WHEN 'cozy' THEN '#fed7d7'
      WHEN 'deep' THEN '#ccfbf1'
      ELSE '#e5e7eb'
    END
  )
  ON CONFLICT (profile_id)
  DO UPDATE SET
    preferred_vibe = EXCLUDED.preferred_vibe,
    vibe_color = EXCLUDED.vibe_color,
    feedback_sentiment = user_preferences.feedback_sentiment || jsonb_build_object('latest_moment', p_moment),
    updated_at = now();
END;
$function$"
"-- Function 87: public.update_username
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_username CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_username(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_profile_id uuid := auth.uid();
BEGIN
  -- Validation
  IF current_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF length(trim(p_username)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;
  
  IF NOT (p_username ~ '^[a-zA-Z0-9_]{3,32}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username format');
  END IF;
  
  -- Check if username is already taken (case-insensitive)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username::text) = lower(p_username) AND id != current_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is already taken');
  END IF;
  
  -- Update the username (store as lowercase)
  UPDATE public.profiles 
  SET username = lower(p_username)::citext, updated_at = now()
  WHERE id = current_profile_id;
  
  RETURN jsonb_build_object('success', true, 'username', lower(p_username));
END;
$function$"
"-- Function 179: public.update_username
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_username CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_username(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_profile_id uuid := auth.uid();
BEGIN
  -- Validation
  IF current_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF length(trim(p_username)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username must be at least 3 characters');
  END IF;
  
  IF NOT (p_username ~ '^[a-zA-Z0-9_]{3,32}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid username format');
  END IF;
  
  -- Check if username is already taken (case-insensitive)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username::text) = lower(p_username) AND id != current_profile_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is already taken');
  END IF;
  
  -- Update the username (store as lowercase)
  UPDATE public.profiles 
  SET username = lower(p_username)::citext, updated_at = now()
  WHERE id = current_profile_id;
  
  RETURN jsonb_build_object('success', true, 'username', lower(p_username));
END;
$function$"
"-- Function 180: public.update_venue_popularity
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_venue_popularity CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_venue_popularity()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  /* popularity = unique visitors in the past 30 days */
  WITH agg AS (
    SELECT venue_id,
           COUNT(DISTINCT profile_id) AS hits_30d
    FROM   public.venue_stays
    WHERE  arrived_at >= now() - INTERVAL '30 days'
    GROUP  BY venue_id
  )
  UPDATE public.venues v
  SET    popularity = COALESCE(a.hits_30d, 0)
  FROM   agg a
  WHERE  a.venue_id = v.id;
END;
$function$"
"-- Function 94: public.update_venue_popularity
-- Drop statement:
DROP FUNCTION IF EXISTS public.update_venue_popularity CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.update_venue_popularity()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  /* popularity = unique visitors in the past 30 days */
  WITH agg AS (
    SELECT venue_id,
           COUNT(DISTINCT profile_id) AS hits_30d
    FROM   public.venue_stays
    WHERE  arrived_at >= now() - INTERVAL '30 days'
    GROUP  BY venue_id
  )
  UPDATE public.venues v
  SET    popularity = COALESCE(a.hits_30d, 0)
  FROM   agg a
  WHERE  a.venue_id = v.id;
END;
$function$"
"-- Function 124: public.upsert_presence
-- Drop statement:
DROP FUNCTION IF EXISTS public.upsert_presence CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.upsert_presence(p_lat double precision, p_lng double precision, p_vibe text DEFAULT 'chill'::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.vibes_now as v (
    profile_id, 
    vibe, 
    location, 
    updated_at, 
    expires_at
  )
  values (
    auth.uid(), 
    p_vibe::vibe_enum,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geometry,
    now(),
    now() + interval '2 minutes'
  )
  on conflict (profile_id)
  do update
     set vibe       = excluded.vibe,
         location   = excluded.location,
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at;
$function$"
"-- Function 181: public.upsert_presence
-- Drop statement:
DROP FUNCTION IF EXISTS public.upsert_presence CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.upsert_presence(p_lat double precision, p_lng double precision, p_vibe text DEFAULT 'chill'::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.vibes_now as v (
    profile_id, 
    vibe, 
    location, 
    updated_at, 
    expires_at
  )
  values (
    auth.uid(), 
    p_vibe::vibe_enum,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geometry,
    now(),
    now() + interval '2 minutes'
  )
  on conflict (profile_id)
  do update
     set vibe       = excluded.vibe,
         location   = excluded.location,
         updated_at = excluded.updated_at,
         expires_at = excluded.expires_at;
$function$"
"-- Function 24: public.upsert_venue_presence_smart
-- Drop statement:
DROP FUNCTION IF EXISTS public.upsert_venue_presence_smart CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.upsert_venue_presence_smart(_venue_id uuid, _profile_id uuid, _vibe vibe_enum, _heartbeat_ts timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  should_update BOOLEAN := FALSE;
  last_heartbeat_ts TIMESTAMPTZ;
  last_vibe vibe_enum;
BEGIN
  -- Check current state
  SELECT last_heartbeat, vibe INTO last_heartbeat_ts, last_vibe
  FROM venue_live_presence 
  WHERE venue_id = _venue_id AND profile_id = _profile_id;
  
  -- Update only if meaningful change: no record, >30s elapsed, or vibe changed
  should_update := (
    last_heartbeat_ts IS NULL OR 
    _heartbeat_ts - last_heartbeat_ts > interval '30 seconds' OR
    last_vibe IS DISTINCT FROM _vibe
  );
  
  IF should_update THEN
    INSERT INTO venue_live_presence (venue_id, profile_id, vibe, last_heartbeat, expires_at)
    VALUES (_venue_id, _profile_id, _vibe, _heartbeat_ts, _heartbeat_ts + interval '2 minutes')
    ON CONFLICT (venue_id, profile_id) 
    DO UPDATE SET 
      last_heartbeat = EXCLUDED.last_heartbeat,
      expires_at = EXCLUDED.expires_at,
      vibe = EXCLUDED.vibe
    WHERE (
      venue_live_presence.last_heartbeat < EXCLUDED.last_heartbeat OR
      venue_live_presence.vibe IS DISTINCT FROM EXCLUDED.vibe
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$"
"-- Function 182: public.upsert_venue_presence_smart
-- Drop statement:
DROP FUNCTION IF EXISTS public.upsert_venue_presence_smart CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.upsert_venue_presence_smart(_venue_id uuid, _profile_id uuid, _vibe vibe_enum, _heartbeat_ts timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  should_update BOOLEAN := FALSE;
  last_heartbeat_ts TIMESTAMPTZ;
  last_vibe vibe_enum;
BEGIN
  -- Check current state
  SELECT last_heartbeat, vibe INTO last_heartbeat_ts, last_vibe
  FROM venue_live_presence 
  WHERE venue_id = _venue_id AND profile_id = _profile_id;
  
  -- Update only if meaningful change: no record, >30s elapsed, or vibe changed
  should_update := (
    last_heartbeat_ts IS NULL OR 
    _heartbeat_ts - last_heartbeat_ts > interval '30 seconds' OR
    last_vibe IS DISTINCT FROM _vibe
  );
  
  IF should_update THEN
    INSERT INTO venue_live_presence (venue_id, profile_id, vibe, last_heartbeat, expires_at)
    VALUES (_venue_id, _profile_id, _vibe, _heartbeat_ts, _heartbeat_ts + interval '2 minutes')
    ON CONFLICT (venue_id, profile_id) 
    DO UPDATE SET 
      last_heartbeat = EXCLUDED.last_heartbeat,
      expires_at = EXCLUDED.expires_at,
      vibe = EXCLUDED.vibe
    WHERE (
      venue_live_presence.last_heartbeat < EXCLUDED.last_heartbeat OR
      venue_live_presence.vibe IS DISTINCT FROM EXCLUDED.vibe
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$"
"-- Function 183: public.upsert_vibes_now_smart
-- Drop statement:
DROP FUNCTION IF EXISTS public.upsert_vibes_now_smart CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.upsert_vibes_now_smart(_profile_id uuid, _vibe vibe_enum, _location geometry, _venue_id uuid DEFAULT NULL::uuid, _visibility text DEFAULT 'public'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  should_update BOOLEAN := FALSE;
  last_location GEOMETRY(POINT, 4326);
  last_update TIMESTAMPTZ;
  last_vibe vibe_enum;
  last_venue_id UUID;
BEGIN
  -- Get last known state
  SELECT location, updated_at, vibe, venue_id 
  INTO last_location, last_update, last_vibe, last_venue_id
  FROM vibes_now WHERE profile_id = _profile_id;
  
  -- Update if: no record, >10m movement, >30s elapsed, vibe changed, or venue changed
  should_update := (
    last_location IS NULL OR
    ST_Distance(last_location::geography, _location::geography) > 10 OR
    now() - COALESCE(last_update, '1970-01-01'::timestamptz) > interval '30 seconds' OR
    last_vibe IS DISTINCT FROM _vibe OR
    last_venue_id IS DISTINCT FROM _venue_id
  );
  
  IF should_update THEN
    INSERT INTO vibes_now (profile_id, vibe, location, venue_id, visibility, updated_at, expires_at)
    VALUES (_profile_id, _vibe, _location, _venue_id, _visibility, now(), now() + interval '2 minutes')
    ON CONFLICT (profile_id) 
    DO UPDATE SET
      vibe = EXCLUDED.vibe,
      location = EXCLUDED.location,
      venue_id = EXCLUDED.venue_id,
      visibility = EXCLUDED.visibility,
      updated_at = EXCLUDED.updated_at,
      expires_at = EXCLUDED.expires_at
    WHERE (
      vibes_now.vibe IS DISTINCT FROM EXCLUDED.vibe OR
      ST_Distance(vibes_now.location::geography, EXCLUDED.location::geography) > 10 OR
      vibes_now.venue_id IS DISTINCT FROM EXCLUDED.venue_id OR
      vibes_now.updated_at < EXCLUDED.updated_at
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$"
"-- Function 187: public.upsert_vibes_now_smart
-- Drop statement:
DROP FUNCTION IF EXISTS public.upsert_vibes_now_smart CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.upsert_vibes_now_smart(_profile_id uuid, _vibe vibe_enum, _location geometry, _venue_id uuid DEFAULT NULL::uuid, _visibility text DEFAULT 'public'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  should_update BOOLEAN := FALSE;
  last_location GEOMETRY(POINT, 4326);
  last_update TIMESTAMPTZ;
  last_vibe vibe_enum;
  last_venue_id UUID;
BEGIN
  -- Get last known state
  SELECT location, updated_at, vibe, venue_id 
  INTO last_location, last_update, last_vibe, last_venue_id
  FROM vibes_now WHERE profile_id = _profile_id;
  
  -- Update if: no record, >10m movement, >30s elapsed, vibe changed, or venue changed
  should_update := (
    last_location IS NULL OR
    ST_Distance(last_location::geography, _location::geography) > 10 OR
    now() - COALESCE(last_update, '1970-01-01'::timestamptz) > interval '30 seconds' OR
    last_vibe IS DISTINCT FROM _vibe OR
    last_venue_id IS DISTINCT FROM _venue_id
  );
  
  IF should_update THEN
    INSERT INTO vibes_now (profile_id, vibe, location, venue_id, visibility, updated_at, expires_at)
    VALUES (_profile_id, _vibe, _location, _venue_id, _visibility, now(), now() + interval '2 minutes')
    ON CONFLICT (profile_id) 
    DO UPDATE SET
      vibe = EXCLUDED.vibe,
      location = EXCLUDED.location,
      venue_id = EXCLUDED.venue_id,
      visibility = EXCLUDED.visibility,
      updated_at = EXCLUDED.updated_at,
      expires_at = EXCLUDED.expires_at
    WHERE (
      vibes_now.vibe IS DISTINCT FROM EXCLUDED.vibe OR
      ST_Distance(vibes_now.location::geography, EXCLUDED.location::geography) > 10 OR
      vibes_now.venue_id IS DISTINCT FROM EXCLUDED.venue_id OR
      vibes_now.updated_at < EXCLUDED.updated_at
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$"
"-- Function 188: public.user_can_access_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_access_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_access_plan(p_plan_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.plan_participants pp
          WHERE pp.plan_id = p_plan_id
            AND pp.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id
            AND fpar.profile_id = auth.uid()
        )
      )
  );
END;
$function$"
"-- Function 184: public.user_can_access_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_access_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_access_plan(p_plan_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.plan_participants pp
          WHERE pp.plan_id = p_plan_id
            AND pp.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id
            AND fpar.profile_id = auth.uid()
        )
      )
  );
END;
$function$"
"-- Function 189: public.user_can_access_plan_simple
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_access_plan_simple CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_access_plan_simple(p_plan uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  SET LOCAL ROLE NONE;
  -- This version doesn't check plan_participants to avoid recursion
  RETURN EXISTS (
    SELECT 1
    FROM floq_plans fp
    JOIN floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan
      AND (fp.creator_id = auth.uid() OR fpar.profile_id = auth.uid())
  );
END;
$function$"
"-- Function 185: public.user_can_access_plan_simple
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_access_plan_simple CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_access_plan_simple(p_plan uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  SET LOCAL ROLE NONE;
  -- This version doesn't check plan_participants to avoid recursion
  RETURN EXISTS (
    SELECT 1
    FROM floq_plans fp
    JOIN floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan
      AND (fp.creator_id = auth.uid() OR fpar.profile_id = auth.uid())
  );
END;
$function$"
"-- Function 186: public.user_can_invite_to_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_invite_to_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_invite_to_plan(p_plan_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Check if user is the plan creator
  SELECT EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = p_plan_id AND fp.creator_id = auth.uid()
  ) OR EXISTS (
    -- Check if user is a co-admin of the floq associated with the plan
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan_id 
      AND fpar.profile_id = auth.uid() 
      AND fpar.role IN ('creator', 'co-admin')
  );
$function$"
"-- Function 190: public.user_can_invite_to_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_invite_to_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_invite_to_plan(p_plan_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Check if user is the plan creator
  SELECT EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = p_plan_id AND fp.creator_id = auth.uid()
  ) OR EXISTS (
    -- Check if user is a co-admin of the floq associated with the plan
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan_id 
      AND fpar.profile_id = auth.uid() 
      AND fpar.role IN ('creator', 'co-admin')
  );
$function$"
"-- Function 191: public.user_can_manage_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_manage_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_manage_plan(p_plan_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id
            AND fpar.profile_id = auth.uid()
            AND fpar.role IN ('creator','co-admin') -- adjust to match enum values
        )
      )
  );
END;
$function$"
"-- Function 148: public.user_can_manage_plan
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_can_manage_plan CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_can_manage_plan(p_plan_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id
            AND fpar.profile_id = auth.uid()
            AND fpar.role IN ('creator','co-admin') -- adjust to match enum values
        )
      )
  );
END;
$function$"
"-- Function 192: public.user_in_floq
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_in_floq CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_in_floq(p_floq uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_participants
    WHERE floq_id = p_floq AND profile_id = auth.uid()
  );
$function$"
"-- Function 149: public.user_in_floq
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_in_floq CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_in_floq(p_floq uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_participants
    WHERE floq_id = p_floq AND profile_id = auth.uid()
  );
$function$"
"-- Function 156: public.user_is_floq_participant
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_is_floq_participant CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_is_floq_participant(p_floq_id uuid, p_profile_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   floq_participants
    WHERE  floq_id   = p_floq_id
      AND  profile_id = COALESCE(p_profile_id, auth.uid())
  );
$function$"
"-- Function 193: public.user_is_floq_participant
-- Drop statement:
DROP FUNCTION IF EXISTS public.user_is_floq_participant CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.user_is_floq_participant(p_floq_id uuid, p_profile_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM   floq_participants
    WHERE  floq_id   = p_floq_id
      AND  profile_id = COALESCE(p_profile_id, auth.uid())
  );
$function$"
"-- Function 194: public.verify_user_id_rewrite
-- Drop statement:
DROP FUNCTION IF EXISTS public.verify_user_id_rewrite CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.verify_profile_id_rewrite(target_schema text DEFAULT 'public'::text)
 RETURNS TABLE(schema_name text, function_name text, kind text, issue text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    -- Check function definitions
    SELECT n.nspname AS schema,
           p.proname AS routine,
           CASE p.prokind
             WHEN 'f' THEN 'function'
             WHEN 'p' THEN 'procedure'
             ELSE 'trigger-func'
           END AS kind,
           'Function definition contains profile_id/invitee_profile_id' AS issue
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = target_schema
      AND  p.prokind IN ('f','p')
      AND  pg_get_functiondef(p.oid) ILIKE ANY (ARRAY['%profile_id%','%invitee_profile_id%'])
    
    UNION ALL
    
    -- Check function parameters
    SELECT n.nspname AS schema,
           p.proname AS routine,
           CASE p.prokind
             WHEN 'f' THEN 'function'
             WHEN 'p' THEN 'procedure'
             ELSE 'trigger-func'
           END AS kind,
           'Function parameter contains profile_id/invitee_profile_id' AS issue
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    JOIN   pg_language l ON l.oid = p.prolang
    CROSS JOIN LATERAL unnest(p.proargnames) WITH ORDINALITY AS a(name, ord)
    WHERE  n.nspname = target_schema
      AND  p.prokind IN ('f','p')
      AND  a.name ILIKE ANY (ARRAY['%profile_id%','%invitee_profile_id%'])
    
    UNION ALL
    
    -- Check function return types
    SELECT n.nspname AS schema,
           p.proname AS routine,
           CASE p.prokind
             WHEN 'f' THEN 'function'
             WHEN 'p' THEN 'procedure'
             ELSE 'trigger-func'
           END AS kind,
           'Function return type contains profile_id field' AS issue
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    JOIN   pg_type t ON t.oid = p.prorettype
    WHERE  n.nspname = target_schema
      AND  p.prokind = 'f'
      AND  t.typtype = 'c'  -- composite type
      AND  EXISTS (
            SELECT 1
            FROM   pg_attribute a
            WHERE  a.attrelid = t.typrelid
              AND  a.attname ILIKE ANY (ARRAY['%profile_id%','%invitee_profile_id%'])
          )
    
    ORDER BY schema_name, function_name;
END;
$function$"
"-- Function 163: public.verify_user_id_rewrite
-- Drop statement:
DROP FUNCTION IF EXISTS public.verify_user_id_rewrite CASCADE;

-- Create statement:
CREATE OR REPLACE FUNCTION public.verify_profile_id_rewrite(target_schema text DEFAULT 'public'::text)
 RETURNS TABLE(schema_name text, function_name text, kind text, issue text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    -- Check function definitions
    SELECT n.nspname AS schema,
           p.proname AS routine,
           CASE p.prokind
             WHEN 'f' THEN 'function'
             WHEN 'p' THEN 'procedure'
             ELSE 'trigger-func'
           END AS kind,
           'Function definition contains profile_id/invitee_profile_id' AS issue
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = target_schema
      AND  p.prokind IN ('f','p')
      AND  pg_get_functiondef(p.oid) ILIKE ANY (ARRAY['%profile_id%','%invitee_profile_id%'])
    
    UNION ALL
    
    -- Check function parameters
    SELECT n.nspname AS schema,
           p.proname AS routine,
           CASE p.prokind
             WHEN 'f' THEN 'function'
             WHEN 'p' THEN 'procedure'
             ELSE 'trigger-func'
           END AS kind,
           'Function parameter contains profile_id/invitee_profile_id' AS issue
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    JOIN   pg_language l ON l.oid = p.prolang
    CROSS JOIN LATERAL unnest(p.proargnames) WITH ORDINALITY AS a(name, ord)
    WHERE  n.nspname = target_schema
      AND  p.prokind IN ('f','p')
      AND  a.name ILIKE ANY (ARRAY['%profile_id%','%invitee_profile_id%'])
    
    UNION ALL
    
    -- Check function return types
    SELECT n.nspname AS schema,
           p.proname AS routine,
           CASE p.prokind
             WHEN 'f' THEN 'function'
             WHEN 'p' THEN 'procedure'
             ELSE 'trigger-func'
           END AS kind,
           'Function return type contains profile_id field' AS issue
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    JOIN   pg_type t ON t.oid = p.prorettype
    WHERE  n.nspname = target_schema
      AND  p.prokind = 'f'
      AND  t.typtype = 'c'  -- composite type
      AND  EXISTS (
            SELECT 1
            FROM   pg_attribute a
            WHERE  a.attrelid = t.typrelid
              AND  a.attname ILIKE ANY (ARRAY['%profile_id%','%invitee_profile_id%'])
          )
    
    ORDER BY schema_name, function_name;
END;
$function$