BEGIN;

---------------------------
-- 1. Historical vibe bridge
---------------------------
CREATE OR REPLACE FUNCTION public.bridge_vibe_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (NEW.updated_at AT TIME ZONE 'UTC')::date;
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.vibe IS DISTINCT FROM OLD.vibe)
     AND NEW.vibe IS NOT NULL THEN

    INSERT INTO public.user_vibe_states AS uvs
           (user_id, vibe_tag, location, started_at, active)
    VALUES (NEW.user_id, NEW.vibe::vibe_enum, NEW.location,
            NEW.updated_at, true)
    ON CONFLICT (user_id, started_at::date) DO UPDATE
        SET vibe_tag = EXCLUDED.vibe_tag,
            location = EXCLUDED.location,
            active    = true;

    -- mark previous records inactive (same day)
    UPDATE public.user_vibe_states
       SET active = false
     WHERE user_id   = NEW.user_id
       AND started_at::date = v_today
       AND id       <> (SELECT id
                        FROM public.user_vibe_states
                        WHERE user_id = NEW.user_id
                          AND started_at::date = v_today
                        ORDER BY started_at DESC
                        LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bridge_vibe_data ON public.vibes_now;
CREATE TRIGGER trg_bridge_vibe_data
AFTER INSERT OR UPDATE ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.bridge_vibe_data();

-- supportive index
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_user_day
  ON public.user_vibe_states (user_id, (started_at::date));

---------------------------
-- 2. User proximity events
---------------------------
CREATE TABLE IF NOT EXISTS public.user_proximity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  proximity_type text DEFAULT 'nearby',
  distance_meters int,
  location geometry(Point, 4326),
  started_at timestamptz DEFAULT now(),
  ended_at   timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create unique constraint using partial index instead
CREATE UNIQUE INDEX IF NOT EXISTS uniq_prox_daily
  ON public.user_proximity_events (user_a_id, user_b_id, date_trunc('day', started_at));

-- basic index
CREATE INDEX IF NOT EXISTS idx_upe_user_day
  ON public.user_proximity_events
  USING btree (user_a_id, date_trunc('day', started_at));

-- RLS: keep simple — allow owners or service_role
ALTER TABLE public.user_proximity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner view"
  ON public.user_proximity_events
  FOR SELECT
  USING (auth.uid() IN (user_a_id, user_b_id));

-- service_role bypass
CREATE POLICY "service manage"
  ON public.user_proximity_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

---------------------------
-- 3. Populate proximity from floqs (dedup safe)
---------------------------
CREATE OR REPLACE FUNCTION public.upsert_floq_proximity_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
INSERT INTO public.user_proximity_events (user_a_id, user_b_id,
                                          proximity_type, location, started_at)
SELECT DISTINCT ON (least(fp1.user_id, fp2.user_id),
                    greatest(fp1.user_id, fp2.user_id),
                    date_trunc('day', GREATEST(fp1.joined_at, fp2.joined_at)))
       least(fp1.user_id, fp2.user_id)   AS user_a,
       greatest(fp1.user_id, fp2.user_id) AS user_b,
       'floq_proximity',
       f.location,
       date_trunc('minute', GREATEST(fp1.joined_at, fp2.joined_at))
FROM public.floq_participants fp1
JOIN public.floq_participants fp2
  ON fp1.floq_id = fp2.floq_id
JOIN public.floqs f ON f.id = fp1.floq_id
WHERE fp1.user_id <> fp2.user_id
  AND f.created_at >= (now() - interval '30 days')
ON CONFLICT DO NOTHING;
$$;

---------------------------
-- 4. Afterglow generator (condensed counters)
---------------------------
CREATE OR REPLACE FUNCTION public.generate_daily_afterglow_sql (
  p_user_id uuid,
  p_date    date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_afterglow_id uuid;
BEGIN
  WITH day_bounds AS (
        SELECT (p_date)::timestamptz                  AS day_start,
               (p_date + 1)::timestamptz - interval '1 microsecond' AS day_end ),
       agg AS (
        SELECT
          -- vibe stats
          (SELECT array_agg(vibe_tag::text ORDER BY started_at)
             FROM public.user_vibe_states uvs, day_bounds
            WHERE user_id = p_user_id
              AND started_at BETWEEN day_start AND day_end)                         AS vibe_path,
          (SELECT mode() WITHIN GROUP (ORDER BY vibe_tag)
             FROM public.user_vibe_states uvs, day_bounds
            WHERE user_id = p_user_id
              AND started_at BETWEEN day_start AND day_end)                         AS dominant_vibe,
          (SELECT count(*) FROM public.user_vibe_states uvs, day_bounds
            WHERE user_id = p_user_id
              AND started_at BETWEEN day_start AND day_end)                         AS vibe_events,
          (SELECT max(started_at) FROM public.user_vibe_states uvs, day_bounds
            WHERE user_id = p_user_id
              AND started_at BETWEEN day_start AND day_end)                         AS peak_vibe_time,

          -- venues / floqs / people
          (SELECT count(DISTINCT venue_id)
             FROM public.venue_live_presence v, day_bounds
            WHERE user_id = p_user_id
              AND last_heartbeat BETWEEN day_start AND day_end)                     AS total_venues,
          (SELECT count(DISTINCT floq_id)
             FROM public.floq_participants fp, day_bounds
            WHERE user_id = p_user_id
              AND joined_at BETWEEN day_start AND day_end)                          AS total_floqs,
          (SELECT count(*)
             FROM public.user_proximity_events upe, day_bounds
            WHERE (user_a_id = p_user_id OR user_b_id = p_user_id)
              AND started_at BETWEEN day_start AND day_end)                         AS crossed_paths
       )
  INSERT INTO public.daily_afterglow (
    user_id, "date",
    dominant_vibe, vibe_path, peak_vibe_time,
    energy_score, social_intensity,
    crossed_paths_count, total_floqs, total_venues,
    emotion_journey, moments,
    is_pinned, is_stale,
    created_at, regenerated_at
  )
  SELECT
    p_user_id, p_date,
    COALESCE(dominant_vibe, 'chill'),
    COALESCE(vibe_path, '{}'),
    peak_vibe_time,
    LEAST(100, vibe_events * 10 + total_venues * 15 + total_floqs * 20),
    LEAST(100, crossed_paths * 20 + total_floqs * 15),
    crossed_paths, total_floqs, total_venues,
    '[]'::jsonb,
    '[]'::jsonb,
    false, false,
    now(), now()
  FROM agg
  ON CONFLICT (user_id, "date")
    DO UPDATE SET
      dominant_vibe       = EXCLUDED.dominant_vibe,
      vibe_path           = EXCLUDED.vibe_path,
      peak_vibe_time      = EXCLUDED.peak_vibe_time,
      energy_score        = EXCLUDED.energy_score,
      social_intensity    = EXCLUDED.social_intensity,
      crossed_paths_count = EXCLUDED.crossed_paths_count,
      total_floqs         = EXCLUDED.total_floqs,
      total_venues        = EXCLUDED.total_venues,
      is_stale            = false,
      regenerated_at      = now()
  RETURNING id INTO v_afterglow_id;

  RETURN v_afterglow_id;
END;
$$;

-- helper indexes for generator
CREATE INDEX IF NOT EXISTS idx_vlp_user_day   ON public.venue_live_presence  (user_id, date_trunc('day', last_heartbeat));
CREATE INDEX IF NOT EXISTS idx_fp_user_day    ON public.floq_participants    (user_id, date_trunc('day', joined_at));
CREATE INDEX IF NOT EXISTS idx_uvs_user_day   ON public.user_vibe_states     (user_id, date_trunc('day', started_at));

COMMIT;