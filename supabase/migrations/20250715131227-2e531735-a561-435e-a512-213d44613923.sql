-- ===== SMART SOCIAL SUGGESTIONS - PHASE 1 ENHANCED =====
-- Production-ready database foundation with performance optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. PING REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.ping_requests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL CHECK (status IN ('pending','accepted','declined')),
  responded_at timestamptz,
  
  -- Constraints
  CONSTRAINT ping_unique_pending UNIQUE (requester_id, target_id) WHERE (status = 'pending'),
  CONSTRAINT ping_no_self CHECK (requester_id <> target_id)
);

-- Indexes for ping_requests
CREATE INDEX IF NOT EXISTS ping_requests_target_idx ON public.ping_requests(target_id);
CREATE INDEX IF NOT EXISTS ping_requests_requester_idx ON public.ping_requests(requester_id);
CREATE INDEX IF NOT EXISTS ping_pending_idx 
  ON public.ping_requests(target_id) 
  WHERE status = 'pending';

-- 2. SHARED LOCATION PINS TABLE  
CREATE TABLE IF NOT EXISTS public.shared_location_pins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  geom       geography(point,4326) NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT pin_future_expiry CHECK (expires_at > now())
);

-- Indexes for shared_location_pins
CREATE INDEX IF NOT EXISTS shared_pins_viewer_idx ON public.shared_location_pins(viewer_id);
CREATE INDEX IF NOT EXISTS shared_pins_owner_idx ON public.shared_location_pins(owner_id);
CREATE INDEX IF NOT EXISTS shared_pins_expire_idx ON public.shared_location_pins(expires_at);
CREATE INDEX IF NOT EXISTS shared_pins_active_idx 
  ON public.shared_location_pins(viewer_id) 
  WHERE expires_at > now();

-- Optimize autovacuum for high-churn pins table
ALTER TABLE public.shared_location_pins 
  SET (autovacuum_vacuum_scale_factor = 0.05);

-- 3. FRIEND PRESENCE VIEW with SECURITY BARRIER
CREATE OR REPLACE VIEW public.friend_presence 
SECURITY BARRIER AS
SELECT 
  f.user_id AS me,
  f.friend_id AS friend,
  uvs.location,
  uvs.vibe_tag,
  uvs.started_at,
  uvs.updated_at
FROM public.friends f
JOIN public.user_vibe_states uvs ON uvs.user_id = f.friend_id
WHERE uvs.active 
  AND uvs.started_at > now() - interval '90 min';

-- 4. SPATIAL INDEX on user_vibe_states (if not exists)
CREATE INDEX IF NOT EXISTS user_vibe_states_location_gist 
  ON public.user_vibe_states 
  USING GIST(location) 
  WHERE active = true;

-- 5. SOCIAL SUGGESTIONS RPC with fallback handling
CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  me uuid,
  max_dist_m integer DEFAULT 1000,
  limit_n integer DEFAULT 5
) 
RETURNS TABLE (
  friend_id uuid,
  display_name text,
  avatar_url text,
  vibe_tag vibe_enum,
  vibe_match real,
  distance_m real,
  updated_at timestamptz
)
LANGUAGE plpgsql 
STABLE PARALLEL SAFE SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Disable sequential scans for guaranteed index usage
  SET LOCAL enable_seqscan = off;
  
  RETURN QUERY
  SELECT
    fp.friend,
    p.display_name,
    p.avatar_url,
    fp.vibe_tag,
    COALESCE(vibe_similarity(uvs.vibe_tag, fp.vibe_tag), 0.0) AS vibe_match,
    ST_DistanceSphere(fp.location, uvs.location)::real AS distance_m,
    fp.updated_at
  FROM public.friend_presence fp
  JOIN public.profiles p ON p.id = fp.friend
  LEFT JOIN LATERAL (
    SELECT v.location, v.vibe_tag
    FROM public.user_vibe_states v
    WHERE v.user_id = me AND v.active
    LIMIT 1
  ) uvs ON TRUE
  WHERE uvs.location IS NOT NULL  -- Ensures caller has active vibe
    AND ST_DistanceSphere(fp.location, uvs.location) <= max_dist_m
    AND fp.me = me
  ORDER BY 
    vibe_match DESC,
    distance_m ASC,
    fp.updated_at DESC
  LIMIT limit_n;
END;
$$;

-- 6. RLS POLICIES

-- Enable RLS
ALTER TABLE public.ping_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_location_pins ENABLE ROW LEVEL SECURITY;

-- Ping requests policies
CREATE POLICY "ping_read_own_or_target"
  ON public.ping_requests
  FOR SELECT
  USING (auth.uid() IN (requester_id, target_id));

CREATE POLICY "ping_insert_self_requester"
  ON public.ping_requests
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "ping_update_target_only"
  ON public.ping_requests
  FOR UPDATE
  USING (target_id = auth.uid());

-- Shared pins policies (no UPDATE allowed - immutable)
CREATE POLICY "pin_viewer_can_see"
  ON public.shared_location_pins
  FOR SELECT
  USING (viewer_id = auth.uid());

CREATE POLICY "pin_owner_insert"
  ON public.shared_location_pins
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "pin_owner_delete"
  ON public.shared_location_pins
  FOR DELETE
  USING (owner_id = auth.uid());

-- 7. CLEANUP CRON JOB with logging
SELECT cron.schedule(
  'prune_shared_pins',
  '0 * * * *',  -- hourly
  $$
  WITH deleted AS (
    DELETE FROM public.shared_location_pins 
    WHERE expires_at < now() 
    RETURNING 1
  )
  SELECT CASE 
    WHEN count(*) > 0 THEN 
      RAISE LOG 'Pruned % expired shared location pins', count(*)
    ELSE NULL
  END
  FROM deleted;
  $$
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_social_suggestions(uuid, integer, integer) TO authenticated;