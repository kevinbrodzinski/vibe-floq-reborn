-- ════════════════════════════════════════════════════════════════
-- Complete Location Pipeline Database Schema
-- ════════════════════════════════════════════════════════════════

-- 1. Venues catalogue
CREATE TABLE IF NOT EXISTS public.venues (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,              -- google place_id, foursquare fsq_id
  provider_id SMALLINT,          -- refs integrations.provider
  name      TEXT NOT NULL,
  radius_m  INT  NOT NULL DEFAULT 50,
  geom      GEOGRAPHY(POINT,4326) NOT NULL,
  geohash5  TEXT GENERATED ALWAYS AS (substr(ST_GeoHash(geom,5),1,5)) STORED,
  category  TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venues_geom ON public.venues USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_venues_geohash5 ON public.venues(geohash5);

-- 2. Raw-ping staging table (fast UNLOGGED for edge function writes)
CREATE UNLOGGED TABLE IF NOT EXISTS public.raw_locations_staging (
  user_id UUID, 
  captured_at TIMESTAMPTZ, 
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION, 
  acc INT
);

-- 3. Partitioned main table (nightly sweep moves rows here)
CREATE TABLE IF NOT EXISTS public.raw_locations (
  id  BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  geom GEOGRAPHY(POINT,4326),
  acc INT,
  p_month TEXT GENERATED ALWAYS AS (to_char(captured_at,'YYYYMM')) STORED,
  p_hash  INT  GENERATED ALWAYS AS ((hashtext(user_id::text)&1023)) STORED,
  PRIMARY KEY (id,captured_at)
) PARTITION BY LIST (p_month);

-- 4. Partition helper function
CREATE OR REPLACE FUNCTION public.ensure_location_partition(_yyyymm TEXT) 
RETURNS VOID
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  t TEXT := format('raw_locations_%s', _yyyymm);
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.raw_locations
       FOR VALUES IN (%L) PARTITION BY LIST (p_hash)', t, _yyyymm);
  FOR i IN 0..1023 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I_%s PARTITION OF public.%I
         FOR VALUES IN (%s)', t, lpad(i::text,4,'0'), t, i);
  END LOOP;
END $$;

-- 5. Ensure unique constraint on daily_afterglow
ALTER TABLE public.daily_afterglow
ADD CONSTRAINT IF NOT EXISTS daily_afterglow_uniq UNIQUE (user_id,date);

-- 6. Optimized matcher function using geohash5
CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  inserted INT := 0;
BEGIN
  WITH candidates AS (
    SELECT DISTINCT ON (rl.user_id, v.id)
           rl.user_id,
           rl.captured_at,
           v.id AS venue_id,
           ST_Distance(rl.geom::geography, v.geom::geography)::NUMERIC AS dist
    FROM   public.raw_locations rl
    JOIN   public.venues v 
           ON substr(ST_GeoHash(rl.geom,5),1,5) = v.geohash5
           AND ST_DWithin(rl.geom::geography, v.geom::geography, v.radius_m)
    WHERE  rl.captured_at >= now() - INTERVAL '15 minutes'
      AND  NOT EXISTS (
             SELECT 1 FROM public.venue_visits pv
             WHERE  pv.user_id = rl.user_id
               AND  pv.venue_id = v.id
               AND  rl.captured_at - pv.arrived_at < INTERVAL '20 minutes'
           )
    ORDER BY rl.user_id, v.id, dist ASC
  )
  INSERT INTO public.venue_visits(user_id, venue_id, arrived_at, distance_m)
  SELECT user_id, venue_id, captured_at, dist
  FROM   candidates
  ON CONFLICT (user_id, venue_id, arrived_at) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END $$;

-- 7. Update build_daily_afterglow to use better data and notifications
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
BEGIN
    -- Process each user's day individually
    FOR v_user_id IN 
        SELECT DISTINCT user_id 
        FROM venue_visits 
        WHERE day_key = _day
    LOOP
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
                                       'lng',  ST_X(v.geom)
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

        -- Skip if no venues visited
        CONTINUE WHEN v_cnt = 0;

        -- Derive scores
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
            v_cnt, 0, 0,
            v_vibe,
            CASE
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
      'message', 'Afterglows generated for active users'
    );
END $$;