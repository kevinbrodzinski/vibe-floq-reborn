-- Drop jobs if they exist (idempotent)
DELETE FROM cron.job
WHERE jobname IN ('refresh_friend_trails',
                  'detect_close_encounter');

------------------------------------------------------------
-- 1. Friend-trail refresher – every minute
SELECT cron.schedule(
  'refresh_friend_trails',
  '* * * * *',
  $$SELECT public.refresh_friend_last_points();$$
);

------------------------------------------------------------
-- 2. Close-encounter scanner – every 5 min
SELECT cron.schedule(
  'detect_close_encounter',
  '*/5 * * * *',
  $$SELECT public.cross_path_scan();$$
);

------------------------------------------------------------
-- 3. Upserted afterglow builder (returns void)
CREATE OR REPLACE FUNCTION public.build_daily_afterglow(_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_cnt      int;
  v_moments  jsonb;
  v_energy   int;
  v_social   int;
  v_vibe     text;
  v_crossed  int;
  v_id       uuid;
BEGIN
  FOR v_user_id IN
      SELECT DISTINCT user_id
      FROM   venue_visits
      WHERE  day_key = _day
  LOOP
      /* quick exit for users with zero venues */
      SELECT COUNT(*) INTO v_cnt
      FROM   venue_visits
      WHERE  user_id = v_user_id AND day_key = _day;
      CONTINUE WHEN v_cnt = 0;

      /* build moments + venue count in one pass */
      WITH aggr AS (
        SELECT
          COUNT(*)                            AS venue_cnt,
          jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid(),
              'timestamp', vv.arrived_at,
              'title', v.name,
              'description', 'Visited ' || v.name,
              'moment_type', 'venue_visit',
              'color', '#3b82f6',
              'metadata', jsonb_build_object(
                            'venue_id', v.id,
                            'venue_name', v.name,
                            'distance_m', vv.distance_m,
                            'lat', ST_Y(v.geom),
                            'lng', ST_X(v.geom)
                          )
            ) ORDER BY vv.arrived_at
          )                                   AS moments
        FROM venue_visits vv
        JOIN venues v ON v.id = vv.venue_id
        WHERE vv.user_id = v_user_id
          AND vv.day_key = _day
      )
      SELECT venue_cnt, moments
      INTO   v_cnt,     v_moments
      FROM   aggr;

      /* crossed paths (indexed on first_seen) */
      SELECT COUNT(*) INTO v_crossed
      FROM   user_encounter
      WHERE  DATE(first_seen) = _day
        AND  (user_a = v_user_id OR user_b = v_user_id);

      /* scores */
      v_energy := CASE
                    WHEN v_cnt <= 2 THEN 45 + v_cnt*10
                    WHEN v_cnt <= 5 THEN 65 + v_cnt*5
                    ELSE 85
                  END;
      v_social := 10 + v_cnt*15 + v_crossed*5;
      v_vibe   := CASE
                    WHEN v_cnt <= 2 THEN 'social'
                    WHEN v_cnt <= 5 THEN 'excited'
                    ELSE 'energetic'
                  END;

      /* upsert */
      INSERT INTO daily_afterglow(
        user_id, date,
        energy_score, social_intensity,
        total_venues, crossed_paths_count,
        dominant_vibe, summary_text, moments,
        regenerated_at)
      VALUES (
        v_user_id, _day,
        v_energy,  v_social,
        v_cnt,     v_crossed,
        v_vibe,
        format('Visited %s venues and crossed paths with %s people', v_cnt, v_crossed),
        v_moments,
        now())
      ON CONFLICT (user_id, date) DO UPDATE
        SET energy_score        = EXCLUDED.energy_score,
            social_intensity    = EXCLUDED.social_intensity,
            total_venues        = EXCLUDED.total_venues,
            crossed_paths_count = EXCLUDED.crossed_paths_count,
            dominant_vibe       = EXCLUDED.dominant_vibe,
            summary_text        = EXCLUDED.summary_text,
            moments             = EXCLUDED.moments,
            regenerated_at      = now()
      RETURNING id INTO v_id;

      /* realtime notification */
      INSERT INTO app_user_notification(user_id, payload)
      VALUES (
        v_user_id,
        jsonb_build_object(
          'type', 'afterglow_ready',
          'date', _day,
          'id',   v_id,
          'msg',  'Your afterglow is ready!'
        )
      );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_daily_afterglow(date) TO authenticated;