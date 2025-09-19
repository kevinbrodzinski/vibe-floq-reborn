-- 1. Location Infrastructure: Create materialized view for latest known points
CREATE MATERIALIZED VIEW IF NOT EXISTS public.last_known_points AS
SELECT DISTINCT ON (profile_id)
  profile_id,
  geog::geography AS point,
  recorded_at AS last_seen_at,
  accuracy
FROM public.location_history
WHERE recorded_at > now() - INTERVAL '4 hours'
ORDER BY profile_id, recorded_at DESC;

CREATE INDEX IF NOT EXISTS idx_lkp_profile ON public.last_known_points(profile_id);
CREATE INDEX IF NOT EXISTS idx_lkp_gist ON public.last_known_points USING gist(point);

-- 2. Helper function for friends nearby (Field rallies)
CREATE OR REPLACE FUNCTION public.friends_nearby(radius_m INT DEFAULT 4000)
RETURNS TABLE(friend_id UUID, point GEOGRAPHY, last_seen_at TIMESTAMPTZ) 
LANGUAGE SQL STABLE AS $$
  WITH my_friends AS (
    SELECT CASE 
      WHEN f.profile_low = auth.uid() THEN f.profile_high 
      ELSE f.profile_low 
    END AS friend_id
    FROM public.friendships f
    WHERE f.friend_state='accepted' 
      AND (f.profile_low = auth.uid() OR f.profile_high = auth.uid())
  ),
  viewer AS (
    SELECT point FROM public.last_known_points WHERE profile_id = auth.uid()
  )
  SELECT lkp.profile_id, lkp.point, lkp.last_seen_at
  FROM my_friends mf
  JOIN public.last_known_points lkp ON lkp.profile_id = mf.friend_id
  JOIN viewer v ON TRUE
  WHERE v.point IS NOT NULL 
    AND ST_DWithin(lkp.point, v.point, radius_m);
$$;

-- 3. Wings Intelligence: Multi-vector vibe energy capture

-- Raw vibe samples (device → edge → this table)
CREATE TABLE IF NOT EXISTS public.vibe_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('solo','floq','venue','rally','plan')),
  floq_id UUID NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  venue_id UUID NULL REFERENCES public.venues(id) ON DELETE SET NULL,
  rally_id UUID NULL REFERENCES public.rallies(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'device' CHECK (source IN ('device','derived','wings')),
  vec JSONB NOT NULL, -- multi-vector energy {energy:0..1, mood:"hype", stress:0..1, social:0..1, stamina:0..1, ...}
  features JSONB NULL DEFAULT '{}'::jsonb, -- optional raw sensors/derived features
  confidence NUMERIC(3,2) NULL
);

CREATE INDEX IF NOT EXISTS idx_vibe_profile_time ON public.vibe_snapshots(profile_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_floq_time ON public.vibe_snapshots(floq_id, recorded_at DESC) WHERE floq_id IS NOT NULL;

-- Per-floq aggregated frames (Wings will upsert)
CREATE TABLE IF NOT EXISTS public.vibe_frames_floq (
  floq_id UUID NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  frame_start TIMESTAMPTZ NOT NULL,
  frame_end TIMESTAMPTZ NOT NULL,
  joint_energy NUMERIC(3,2) NOT NULL,
  harmony NUMERIC(3,2) NOT NULL,
  tension NUMERIC(3,2) NOT NULL,
  sample_n INT NOT NULL,
  PRIMARY KEY (floq_id, frame_start)
);

-- Per-venue heartbeat (optional later)
CREATE TABLE IF NOT EXISTS public.venue_heartbeat (
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  frame_start TIMESTAMPTZ NOT NULL,
  foot_traffic INT NOT NULL,
  avg_energy NUMERIC(3,2) NOT NULL,
  PRIMARY KEY (venue_id, frame_start)
);

-- RLS policies for vibe data

ALTER TABLE public.vibe_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can insert their own vibe snapshots
CREATE POLICY vibe_snapshots_insert ON public.vibe_snapshots
FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Users can read their own vibe snapshots
CREATE POLICY vibe_snapshots_read_own ON public.vibe_snapshots
FOR SELECT USING (profile_id = auth.uid());

-- Floq members can read floq vibe snapshots
CREATE POLICY vibe_snapshots_read_floq ON public.vibe_snapshots
FOR SELECT USING (
  floq_id IS NOT NULL 
  AND public.viewer_in_floq(floq_id)
);

ALTER TABLE public.vibe_frames_floq ENABLE ROW LEVEL SECURITY;

-- Floq members can read aggregated frames
CREATE POLICY vibe_frames_floq_read ON public.vibe_frames_floq
FOR SELECT USING (public.viewer_in_floq(floq_id));

-- Service role can write aggregated frames
CREATE POLICY vibe_frames_floq_service_write ON public.vibe_frames_floq
FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role')
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

ALTER TABLE public.venue_heartbeat ENABLE ROW LEVEL SECURITY;

-- Public read for venue heartbeat
CREATE POLICY venue_heartbeat_read ON public.venue_heartbeat
FOR SELECT USING (true);

-- Service role can write venue heartbeat
CREATE POLICY venue_heartbeat_service_write ON public.venue_heartbeat
FOR ALL USING (current_setting('request.jwt.claim.role', true) = 'service_role')
WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');