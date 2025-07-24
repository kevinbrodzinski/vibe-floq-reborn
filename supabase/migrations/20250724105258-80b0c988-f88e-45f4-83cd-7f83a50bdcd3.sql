-- ═══════════════════════════════════════════════════════════════════════════════
-- Visit Merging and Crossed Paths Detection
-- Completes the location pipeline with enter/leave events and social encounters
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add departed_at column to venue_visits if not exists
ALTER TABLE public.venue_visits 
ADD COLUMN IF NOT EXISTS departed_at TIMESTAMPTZ;

-- 2. Create visit merge function - collapses consecutive pings into sessions
CREATE OR REPLACE FUNCTION public.merge_venue_visits()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  _updated INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id, user_id, venue_id,
           arrived_at,
           LAG(arrived_at) OVER (PARTITION BY user_id,venue_id ORDER BY arrived_at) AS prev_at
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
END $$;

-- 3. Create crossed paths table for social encounters
CREATE TABLE IF NOT EXISTS public.crossed_paths (
  id BIGSERIAL PRIMARY KEY,
  user_a UUID NOT NULL,
  user_b UUID NOT NULL, 
  venue_id UUID NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_a,user_b,venue_id,ts::DATE)
);

-- Enable RLS and create policy
ALTER TABLE public.crossed_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own crossed paths" 
ON public.crossed_paths 
FOR SELECT 
USING (user_a = auth.uid() OR user_b = auth.uid());

-- 4. Create crossed paths detection function
CREATE OR REPLACE FUNCTION public.detect_crossed_paths()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  ins INT;
BEGIN
  INSERT INTO public.crossed_paths(user_a,user_b,venue_id,ts)
  SELECT v1.user_id, v2.user_id, v1.venue_id,
         GREATEST(v1.arrived_at,v2.arrived_at)
  FROM   public.venue_visits v1
  JOIN   public.venue_visits v2 USING (venue_id,day_key)
  WHERE  v1.user_id < v2.user_id
    AND  COALESCE(v1.departed_at,now()) >
         COALESCE(v2.arrived_at,now())            -- overlap check
    AND  v1.day_key = (current_date - INTERVAL '1 day')::DATE
  ON CONFLICT DO NOTHING;
  
  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END $$;

-- 5. Add new cron jobs for visit merging and crossed paths
-- Note: These will be added after the functions are created

-- Visit merge job (every 10 minutes)
SELECT cron.schedule(
  'merge_visit_rows',
  '*/10 * * * *',
  $$SELECT public.merge_venue_visits();$$
);

-- Crossed paths detection (daily at 05:00 UTC)
SELECT cron.schedule(
  'crossed_paths_daily',
  '0 5 * * *',
  $$SELECT public.detect_crossed_paths();$$
);

-- 6. Update daily afterglow function to include crossed paths count
CREATE OR REPLACE FUNCTION public.build_daily_afterglow(_day DATE)
RETURNS JSONB
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
          AND cp.ts::DATE = _day;

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