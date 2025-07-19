BEGIN;

-- ❶ ensure vibes_now exists (quick scaffold – adjust columns to match prod)
CREATE TABLE IF NOT EXISTS public.vibes_now (
  user_id      uuid        PRIMARY KEY,
  vibe         text,
  location     geometry(Point,4326),
  geo          geography,
  updated_at   timestamptz DEFAULT now(),
  expires_at   timestamptz
);

-- ❷ historical store
CREATE TABLE IF NOT EXISTS public.user_vibe_states (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  vibe_tag   text NOT NULL,
  location   geometry(Point,4326),
  started_at timestamptz NOT NULL,
  active     boolean      DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_uvs_user_day
  ON public.user_vibe_states (user_id, started_at);

-- ❸ trigger bridges live → history (insert *and* update)
CREATE OR REPLACE FUNCTION public.bridge_vibe_data()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_today date := (NEW.updated_at AT TIME ZONE 'UTC')::date;
BEGIN
  IF (TG_OP = 'INSERT'
      OR NEW.vibe IS DISTINCT FROM OLD.vibe)
     AND NEW.vibe IS NOT NULL THEN

    INSERT INTO public.user_vibe_states AS uvs
           (user_id,vibe_tag,location,started_at,active)
    VALUES (NEW.user_id,NEW.vibe,NEW.location,NEW.updated_at,true)
    ON CONFLICT (user_id, started_at)
      DO UPDATE SET
         vibe_tag = EXCLUDED.vibe_tag,
         location = EXCLUDED.location,
         active   = true;

    UPDATE public.user_vibe_states
       SET active = false
     WHERE user_id = NEW.user_id
       AND started_at::date = v_today
       AND id <> (SELECT id FROM public.user_vibe_states
                  WHERE user_id = NEW.user_id
                    AND started_at::date = v_today
                  ORDER BY started_at DESC
                  LIMIT 1);
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_bridge_vibe_data ON public.vibes_now;
CREATE TRIGGER trg_bridge_vibe_data
AFTER INSERT OR UPDATE ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.bridge_vibe_data();

-- ❹ social proximity
CREATE TABLE IF NOT EXISTS public.user_proximity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  proximity_type text DEFAULT 'nearby',
  distance_meters int,
  location geometry(Point,4326),
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Create unique index instead of constraint for proximity events
CREATE UNIQUE INDEX IF NOT EXISTS uniq_proximity_user_pair_day
  ON public.user_proximity_events (
    least(user_a_id,user_b_id),
    greatest(user_a_id,user_b_id),
    date_trunc('day',started_at)
  );

-- ❺ afterglow generator (condensed)
CREATE OR REPLACE FUNCTION public.generate_daily_afterglow_sql (
  p_user uuid, p_date date
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE aid uuid;
BEGIN
WITH bounds AS (
  SELECT (p_date)::timestamptz AS ds,
         (p_date + 1)::timestamptz - '1 microsecond'::interval AS de),
agg AS (
  SELECT
    (SELECT array_agg(vibe_tag ORDER BY started_at)
       FROM public.user_vibe_states u, bounds
      WHERE user_id=p_user AND started_at BETWEEN ds AND de)                  AS vibe_path,
    (SELECT mode() WITHIN GROUP (ORDER BY vibe_tag)
       FROM public.user_vibe_states u, bounds
      WHERE user_id=p_user AND started_at BETWEEN ds AND de)                  AS dominant_vibe,
    (SELECT COUNT(*) FROM public.user_vibe_states u, bounds
      WHERE user_id=p_user AND started_at BETWEEN ds AND de)                  AS vibe_events,
    (SELECT MAX(started_at) FROM public.user_vibe_states u, bounds
      WHERE user_id=p_user AND started_at BETWEEN ds AND de)                  AS peak_vibe_time,
    (SELECT COUNT(DISTINCT venue_id) FROM public.venue_live_presence v,bounds
      WHERE user_id=p_user AND last_heartbeat BETWEEN ds AND de)              AS venues,
    (SELECT COUNT(DISTINCT floq_id) FROM public.floq_participants f,bounds
      WHERE user_id=p_user AND joined_at BETWEEN ds AND de)                  AS floqs,
    (SELECT COUNT(*) FROM public.user_proximity_events e,bounds
      WHERE (user_a_id=p_user OR user_b_id=p_user)
        AND started_at BETWEEN ds AND de)                                     AS paths)
INSERT INTO public.daily_afterglow (
  user_id,"date",dominant_vibe,vibe_path,peak_vibe_time,
  energy_score,social_intensity,crossed_paths_count,
  total_floqs,total_venues,is_pinned,is_stale,created_at,regenerated_at
)
SELECT p_user,p_date,
       coalesce(dominant_vibe,'chill'),
       coalesce(vibe_path,'{}'),
       peak_vibe_time,
       LEAST(100,vibe_events*10+venues*15+floqs*20),
       LEAST(100,paths*20+floqs*15),
       paths,floqs,venues,false,false,now(),now()
FROM agg
ON CONFLICT (user_id,"date") DO UPDATE
  SET dominant_vibe       = EXCLUDED.dominant_vibe,
      vibe_path           = EXCLUDED.vibe_path,
      peak_vibe_time      = EXCLUDED.peak_vibe_time,
      energy_score        = EXCLUDED.energy_score,
      social_intensity    = EXCLUDED.social_intensity,
      crossed_paths_count = EXCLUDED.crossed_paths_count,
      total_floqs         = EXCLUDED.total_floqs,
      total_venues        = EXCLUDED.total_venues,
      is_stale            = false,
      regenerated_at      = now()
RETURNING id INTO aid;
RETURN aid;
END$$;

-- helpful indexes
CREATE INDEX IF NOT EXISTS idx_vlp_user_day
  ON public.venue_live_presence (user_id, last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_fp_user_day
  ON public.floq_participants (user_id, joined_at);

COMMIT;