-- Daily afterglow generation functions

/* Generate daily afterglow for all users with activity on given date */
CREATE OR REPLACE FUNCTION public.build_daily_afterglow(_day date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cnt          INT;
    v_moments      JSONB;
    v_energy       INT;
    v_social       INT;
    v_vibe         TEXT;
    v_afterglow_id UUID;
    v_user_id      UUID;
    v_total_users  INT := 0;
    v_crossed_paths INT;
BEGIN
    -- Process each user's day individually
    FOR v_user_id IN 
        SELECT DISTINCT user_id 
        FROM venue_visits 
        WHERE day_key = _day
    LOOP
        v_total_users := v_total_users + 1;
        
        -- Gather venue data for this user
        WITH data AS (
            SELECT
                COUNT(*)::INT AS venue_cnt,
                COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'id',        gen_random_uuid(),
                      'timestamp', vv.arrived_at,
                      'title',     v.name,
                      'description', 'Visited ' || v.name,
                      'moment_type','venue_visit',
                      'color',      '#3b82f6',
                      'metadata',   jsonb_build_object(
                                       'venue_id',    v.id,
                                       'venue_name',  v.name,
                                       'distance_m',  vv.distance_m,
                                       'lat',  ST_Y(v.geom),
                                       'lng',  ST_X(v.geom),
                                       'arrived_at', vv.arrived_at,
                                       'departed_at', vv.departed_at
                                     )
                    ) ORDER BY vv.arrived_at
                  ),
                  '[]'::JSONB
                ) AS moments
            FROM venue_visits vv
            JOIN venues v ON v.id = vv.venue_id
            WHERE vv.user_id = v_user_id
              AND vv.day_key = _day
        )
        SELECT venue_cnt, moments
        INTO   v_cnt, v_moments
        FROM   data;

        -- Get crossed paths count for this user/day
        SELECT COUNT(*)::INT INTO v_crossed_paths
        FROM crossed_paths cp
        WHERE (cp.user_a = v_user_id OR cp.user_b = v_user_id)
          AND cp.encounter_date = _day;

        -- Skip if no venues visited
        CONTINUE WHEN v_cnt = 0;

        -- Derive scores (now includes social boost from crossed paths)
        v_energy := CASE
                      WHEN v_cnt = 0           THEN 20
                      WHEN v_cnt <= 2          THEN 45 + v_cnt*10
                      WHEN v_cnt <= 5          THEN 65 + v_cnt*5
                      ELSE 85
                    END;
        v_social := CASE
                      WHEN v_cnt = 0           THEN 10
                      WHEN v_cnt <= 2          THEN 30 + v_cnt*15
                      WHEN v_cnt <= 5          THEN 60 + v_cnt*8
                      ELSE 90
                    END + (v_crossed_paths * 5); -- social boost for encounters
        
        v_vibe   := CASE
                      WHEN v_cnt = 0 THEN 'chill'
                      WHEN v_cnt <= 2 THEN 'social'
                      WHEN v_cnt <= 5 THEN 'excited'
                      ELSE 'energetic'
                    END;

        -- Upsert afterglow
        INSERT INTO daily_afterglow (
            user_id, date,
            energy_score, social_intensity,
            total_venues, total_floqs, crossed_paths_count,
            dominant_vibe,
            summary_text,
            vibe_path,
            emotion_journey,
            moments,
            created_at, regenerated_at
        )
        VALUES (
            v_user_id, _day,
            v_energy, v_social,
            v_cnt, 0, v_crossed_paths,
            v_vibe,
            CASE
              WHEN v_cnt = 1  THEN 'A focused day with one meaningful stop'
              WHEN v_cnt <= 3 THEN 'A balanced day exploring ' || v_cnt || ' places'
              ELSE                'An active day visiting '   || v_cnt || ' venues'
            END || 
            CASE 
              WHEN v_crossed_paths > 0 THEN ' and crossed paths with ' || v_crossed_paths || ' people'
              ELSE ''
            END,
            CASE
              WHEN v_cnt <= 1 THEN ARRAY['chill']
              WHEN v_cnt <= 3 THEN ARRAY['chill','social']
              ELSE                 ARRAY['chill','social','excited']
            END,
            jsonb_build_array(
              jsonb_build_object(
                'timestamp', to_char(_day,'YYYY-MM-DD') || 'T18:00:00Z',
                'vibe',      v_vibe,
                'intensity', v_energy
              )
            ),
            v_moments,
            now(),
            now()
        )
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            energy_score        = EXCLUDED.energy_score,
            social_intensity    = EXCLUDED.social_intensity,
            total_venues        = EXCLUDED.total_venues,
            crossed_paths_count = EXCLUDED.crossed_paths_count,
            dominant_vibe       = EXCLUDED.dominant_vibe,
            summary_text        = EXCLUDED.summary_text,
            vibe_path           = EXCLUDED.vibe_path,
            emotion_journey     = EXCLUDED.emotion_journey,
            moments             = EXCLUDED.moments,
            regenerated_at      = now()
        RETURNING id INTO v_afterglow_id;

        -- Notify user via Realtime-compatible table insert
        INSERT INTO app_user_notification (user_id, payload)
        VALUES (
          v_user_id,
          jsonb_build_object(
            'type', 'afterglow_ready',
            'date', _day,
            'id', v_afterglow_id,
            'msg', 'Your afterglow is ready!'
          )
        );

    END LOOP;

    RETURN jsonb_build_object(
      'success', true,
      'date', _day,
      'users_processed', v_total_users,
      'message', 'Afterglows generated for active users with crossed paths tracking'
    );
END $$;

/* Generate daily afterglow for a specific user */
CREATE OR REPLACE FUNCTION public.generate_daily_afterglow_sql(p_user_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cnt          int;
    v_moments      jsonb;
    v_energy       int;
    v_social       int;
    v_vibe         text;
    v_afterglow_id uuid;
BEGIN
    /* 1 ─ gather venue data in one go */
    WITH data AS (
        SELECT
            COUNT(*)                                            AS venue_cnt,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'id',        gen_random_uuid(),
                  'timestamp', vv.arrived_at,
                  'title',     v.name,
                  'description', 'Visited ' || v.name,
                  'moment_type','venue_visit',
                  'color',      '#3b82f6',
                  'metadata',   jsonb_build_object(
                                   'venue_id',    v.id,
                                   'venue_name',  v.name,
                                   'distance_m',  vv.distance_m,
                                   'lat',  ST_Y(v.geom),
                                   'lng',  ST_X(v.geom)
                                 )
                ) ORDER BY vv.arrived_at
              ),
              '[]'::jsonb
            )                                                   AS moments
        FROM venue_visits  vv
        JOIN venues        v  ON v.id = vv.venue_id
        WHERE vv.user_id = p_user_id
          AND vv.day_key  = p_date
    )
    SELECT venue_cnt, moments
    INTO   v_cnt,     v_moments
    FROM   data;

    /* 2 ─ derive scores  */
    v_energy := CASE
                  WHEN v_cnt = 0           THEN 20
                  WHEN v_cnt <= 2          THEN 45 + v_cnt*10
                  WHEN v_cnt <= 5          THEN 65 + v_cnt*5
                  ELSE 85
                END;
    v_social := CASE
                  WHEN v_cnt = 0           THEN 10
                  WHEN v_cnt <= 2          THEN 30 + v_cnt*15
                  WHEN v_cnt <= 5          THEN 60 + v_cnt*8
                  ELSE 90
                END;
    v_vibe   := CASE
                  WHEN v_cnt = 0 THEN 'chill'
                  WHEN v_cnt <= 2 THEN 'social'
                  WHEN v_cnt <= 5 THEN 'excited'
                  ELSE 'energetic'
                END;

    /* 3 ─ upsert afterglow */
    INSERT INTO daily_afterglow (
        user_id, date,
        energy_score, social_intensity,
        total_venues, total_floqs, crossed_paths_count,
        dominant_vibe,
        summary_text,
        vibe_path,
        emotion_journey,
        moments,
        created_at, regenerated_at
    )
    VALUES (
        p_user_id, p_date,
        v_energy,  v_social,
        v_cnt,     0,        0,         -- placeholders for future floq/x-paths
        v_vibe,
        CASE
          WHEN v_cnt = 0  THEN 'A quiet day at home'
          WHEN v_cnt = 1  THEN 'A focused day with one meaningful stop'
          WHEN v_cnt <= 3 THEN 'A balanced day exploring ' || v_cnt || ' places'
          ELSE                'An active day visiting '   || v_cnt || ' venues'
        END,
        CASE
          WHEN v_cnt <= 1 THEN ARRAY['chill']
          WHEN v_cnt <= 3 THEN ARRAY['chill','social']
          ELSE                 ARRAY['chill','social','excited']
        END,
        jsonb_build_array(
          jsonb_build_object(
            'timestamp', to_char(p_date,'YYYY-MM-DD') || 'T18:00:00Z',
            'vibe',      v_vibe,
            'intensity', v_energy
          )
        ),
        v_moments,
        now(),           -- created_at
        now()            -- regenerated_at
    )
    ON CONFLICT (user_id, date)           -- PK or UNIQUE constraint required
    DO UPDATE SET
        energy_score        = EXCLUDED.energy_score,
        social_intensity    = EXCLUDED.social_intensity,
        total_venues        = EXCLUDED.total_venues,
        dominant_vibe       = EXCLUDED.dominant_vibe,
        summary_text        = EXCLUDED.summary_text,
        vibe_path           = EXCLUDED.vibe_path,
        emotion_journey     = EXCLUDED.emotion_journey,
        moments             = EXCLUDED.moments,
        regenerated_at      = now()
    RETURNING id INTO v_afterglow_id;

    /* 4 ─ done */
    RETURN jsonb_build_object(
      'success',       true,
      'afterglow_id',  v_afterglow_id,
      'venue_count',   v_cnt,
      'message',       'Afterglow generated from venue visits'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_daily_afterglow(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_afterglow_sql(uuid, date) TO authenticated;