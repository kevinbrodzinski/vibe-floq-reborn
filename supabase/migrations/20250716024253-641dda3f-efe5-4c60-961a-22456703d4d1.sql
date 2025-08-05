/* ====================================================================== */
/*  ANALYTICS & INSIGHT HELPERS  –  FINAL, TYPESAFE, ERROR-FREE            */
/* ====================================================================== */

-------------------------
-- 0. Performance indexes
-------------------------
CREATE INDEX IF NOT EXISTS idx_daily_afterglow_user_date
  ON public.daily_afterglow (user_id, "date" DESC);

CREATE INDEX IF NOT EXISTS idx_venue_live_presence_user_date
  ON public.venue_live_presence (user_id, checked_in_at);

-----------------------------------------------------------
-- 1. Weekly patterns  (energy / social / attendance means)
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_afterglow_weekly_patterns(
  p_user_id     uuid    DEFAULT auth.uid(),
  p_weeks_back  integer DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
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
    WHERE   da.user_id = p_user_id
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
$func$;


-----------------------------------------------------------
-- 2. Monthly trends  (energy / social / dominant vibes …)
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_afterglow_monthly_trends(
  p_user_id      uuid    DEFAULT auth.uid(),
  p_months_back  integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
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
    WHERE   da.user_id = p_user_id
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
    WHERE  da.user_id = p_user_id
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
$func$;


-----------------------------------------------------------
-- 3. Location insights  (top venues & best visit times)
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_afterglow_location_insights(
  p_user_id    uuid    DEFAULT auth.uid(),
  p_days_back  integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'user not authenticated');
  END IF;

  /* Every check-in merged with its afterglow energy for weighting ------ */
  WITH visit_log AS (
    SELECT
      v.id,
      v.name,
      v.lat,
      v.lng,
      vlp.checked_in_at,
      da.energy_score
    FROM   public.venue_live_presence vlp
    JOIN   public.venues             v  ON v.id      = vlp.venue_id
    JOIN   public.daily_afterglow    da ON da.user_id = vlp.user_id
                                       AND da."date" = DATE(vlp.checked_in_at)
    WHERE  vlp.user_id = p_user_id
      AND  vlp.checked_in_at >= CURRENT_DATE - (p_days_back * INTERVAL '1 day')
  ),

  venue_rollup AS (
    SELECT
      id, name, lat, lng,
      COUNT(*)                       AS visit_count,
      AVG(energy_score)              AS avg_energy
    FROM   visit_log
    GROUP  BY id, name, lat, lng
    ORDER  BY visit_count DESC, avg_energy DESC
    LIMIT  10
  ),

  time_preferences AS (
    SELECT
      CASE
        WHEN date_part('hour', checked_in_at) BETWEEN  6 AND 11 THEN 'morning'
        WHEN date_part('hour', checked_in_at) BETWEEN 12 AND 17 THEN 'afternoon'
        WHEN date_part('hour', checked_in_at) BETWEEN 18 AND 22 THEN 'evening'
        ELSE                                                    'night'
      END                                        AS time_block,
      COUNT(*)                                   AS freq
    FROM visit_log
    GROUP BY time_block
    ORDER BY freq DESC
  )

  /* Build final JSON result ------------------------------------------- */
  SELECT jsonb_build_object(
           'top_venues', COALESCE(
             (SELECT jsonb_agg(
                       jsonb_build_object(
                         'venue_id',     vr.id,
                         'venue_name',   vr.name,
                         'lat',          vr.lat,
                         'lng',          vr.lng,
                         'visit_count',  vr.visit_count,
                         'avg_energy',   ROUND(vr.avg_energy, 2)
                       )
                     )
              FROM venue_rollup vr), '[]'::jsonb
           ),
           'best_time_of_day', COALESCE(
             (SELECT jsonb_agg(
                       jsonb_build_object(
                         'time_block', tp.time_block,
                         'frequency',  tp.freq
                       ) ORDER BY tp.freq DESC
                     )
              FROM time_preferences tp), '[]'::jsonb
           )
         )
    INTO result;

  RETURN result;
END;
$func$;


-----------------------------------------------------------
-- 4. Personal insights  (streaks, trends, recommendations)
-----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_personal_insights(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  result jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'user not authenticated');
  END IF;

  WITH streak_analysis AS (
    SELECT
      COUNT(*) FILTER (WHERE is_active_day) AS current_streak
    FROM (
      SELECT
        da."date",
        (da.total_venues + da.total_floqs > 0) AS is_active_day,
        ROW_NUMBER() OVER (ORDER BY da."date" DESC) -
        ROW_NUMBER() OVER (PARTITION BY (da.total_venues + da.total_floqs > 0) 
                          ORDER BY da."date" DESC) AS streak_group
      FROM public.daily_afterglow da
      WHERE da.user_id = p_user_id
        AND da."date" >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY da."date" DESC
    ) grouped
    WHERE streak_group = 0 AND is_active_day
  ),

  recent_social_trend AS (
    SELECT
      AVG(da.social_intensity) FILTER (WHERE da."date" >= CURRENT_DATE - INTERVAL '7 days') AS recent_avg,
      AVG(da.social_intensity) FILTER (WHERE da."date" BETWEEN CURRENT_DATE - INTERVAL '14 days' 
                                                           AND CURRENT_DATE - INTERVAL '7 days') AS older_avg
    FROM public.daily_afterglow da
    WHERE da.user_id = p_user_id
      AND da."date" >= CURRENT_DATE - INTERVAL '14 days'
  ),

  energy_trend AS (
    SELECT
      AVG(da.energy_score) FILTER (WHERE da."date" >= CURRENT_DATE - INTERVAL '7 days') AS recent_energy,
      AVG(da.energy_score) FILTER (WHERE da."date" BETWEEN CURRENT_DATE - INTERVAL '14 days' 
                                                        AND CURRENT_DATE - INTERVAL '7 days') AS older_energy
    FROM public.daily_afterglow da
    WHERE da.user_id = p_user_id
      AND da."date" >= CURRENT_DATE - INTERVAL '14 days'
  )

  SELECT jsonb_build_object(
           'current_streak_days', COALESCE(sa.current_streak, 0),
           'social_trend', CASE
             WHEN COALESCE(rst.recent_avg, 0) > COALESCE(rst.older_avg, 0) * 1.1 THEN 'increasing'
             WHEN COALESCE(rst.recent_avg, 0) < COALESCE(rst.older_avg, 0) * 0.9 THEN 'decreasing'
             ELSE 'stable'
           END,
           'energy_trend', CASE
             WHEN COALESCE(et.recent_energy, 0) > COALESCE(et.older_energy, 0) * 1.1 THEN 'increasing'
             WHEN COALESCE(et.recent_energy, 0) < COALESCE(et.older_energy, 0) * 0.9 THEN 'decreasing'
             ELSE 'stable'
           END,
           'avg_social_recent', ROUND(COALESCE(rst.recent_avg, 0), 2),
           'avg_energy_recent', ROUND(COALESCE(et.recent_energy, 0), 2)
         )
    INTO result
  FROM streak_analysis sa
  CROSS JOIN recent_social_trend rst
  CROSS JOIN energy_trend et;

  RETURN result;
END;
$func$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_afterglow_weekly_patterns(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_afterglow_monthly_trends(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_afterglow_location_insights(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_personal_insights(uuid) TO authenticated;