
-- ==========================================
-- FLOQ BOOSTS SYSTEM - CORRECTED VERSION
-- Addresses all critical issues identified
-- ==========================================

-- 1. CREATE FLOQ_BOOSTS TABLE WITH PROPER FOREIGN KEYS
CREATE TABLE public.floq_boosts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id     UUID NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_type  TEXT NOT NULL DEFAULT 'vibe',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes'),
  CONSTRAINT unique_user_boost UNIQUE (floq_id, user_id, boost_type)
);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.floq_boosts ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RESTRICTIVE RLS POLICIES
CREATE POLICY "boosts: insert own" ON public.floq_boosts
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "boosts: view visible floqs only" ON public.floq_boosts
  FOR SELECT 
  USING (
    expires_at > NOW()
    AND EXISTS (
      SELECT 1 FROM public.floqs f
      WHERE f.id = floq_boosts.floq_id
        AND (
          f.visibility = 'public'
          OR f.creator_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.floq_participants fp
            WHERE fp.floq_id = f.id AND fp.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "boosts: delete own" ON public.floq_boosts
  FOR DELETE 
  USING (user_id = auth.uid());

-- 4. CREATE PERFORMANCE INDEXES
-- Partial index for active boosts (hot set optimization)
CREATE INDEX idx_floq_boosts_active 
  ON public.floq_boosts(floq_id) 
  WHERE expires_at > NOW();

-- Index for cleanup operations
CREATE INDEX idx_floq_boosts_expires 
  ON public.floq_boosts(expires_at);

-- 5. ENABLE REALTIME FOR BOOST EVENTS
ALTER TABLE public.floq_boosts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_boosts;

-- 6. UPDATE GET_ACTIVE_FLOQS_WITH_MEMBERS RPC (SECURITY DEFINER FIX)
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_user_lat NUMERIC DEFAULT NULL,
  p_user_lng NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  id UUID, 
  title TEXT, 
  name TEXT, 
  primary_vibe vibe_enum, 
  vibe_tag vibe_enum, 
  type TEXT, 
  starts_at TIMESTAMPTZ, 
  ends_at TIMESTAMPTZ, 
  participant_count BIGINT, 
  boost_count BIGINT,
  starts_in_min INTEGER, 
  distance_meters NUMERIC,
  members JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
SET role = authenticated
AS $$
DECLARE
  user_point GEOMETRY(POINT, 4326);
BEGIN
  -- Input validation and limits
  p_limit := GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
  p_offset := GREATEST(0, COALESCE(p_offset, 0));
  
  -- Create user location point if provided
  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    user_point := ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326);
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.name,
    f.primary_vibe,
    f.primary_vibe AS vibe_tag,
    COALESCE(f.type, 'auto') AS type,
    f.starts_at,
    f.ends_at,
    COALESCE(c.participant_count, 0) AS participant_count,
    COALESCE(b.boost_count, 0) AS boost_count,
    GREATEST(0, EXTRACT(EPOCH FROM (f.starts_at - NOW()))/60)::INTEGER AS starts_in_min,
    CASE 
      WHEN user_point IS NOT NULL 
      THEN ST_Distance(f.location::geography, user_point::geography)
      ELSE NULL 
    END AS distance_meters,
    COALESCE(m.members, '[]'::jsonb) AS members
  FROM floqs f
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM floq_participants fp
    WHERE fp.floq_id = f.id
  ) c ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS boost_count
    FROM floq_boosts fb
    WHERE fb.floq_id = f.id 
      AND fb.expires_at > NOW()
  ) b ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'avatar_url', p.avatar_url,
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name
    ) ORDER BY fp.joined_at DESC) AS members
    FROM floq_participants fp
    JOIN profiles p ON p.id = fp.user_id
    WHERE fp.floq_id = f.id
    LIMIT 6  -- Show max 6 member avatars
  ) m ON TRUE
  WHERE f.ends_at > NOW()
    AND f.visibility = 'public'
  ORDER BY 
    CASE 
      WHEN user_point IS NOT NULL 
      THEN ST_Distance(f.location::geography, user_point::geography)
      ELSE f.starts_at 
    END
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 7. CREATE CLEANUP FUNCTION WITH OBSERVABILITY
CREATE OR REPLACE FUNCTION public.cleanup_expired_floq_boosts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.floq_boosts 
  WHERE expires_at < NOW() - INTERVAL '1 minute';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log for observability
  RAISE NOTICE '% expired floq boosts removed', deleted_count;
  
  RETURN deleted_count;
END;
$$;

-- 8. SCHEDULE CLEANUP JOB (if pg_cron is available)
DO $$
BEGIN
  -- Only schedule if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup_floq_boosts',
      '*/15 * * * *',  -- Every 15 minutes
      $cleanup$ SELECT public.cleanup_expired_floq_boosts(); $cleanup$
    );
    RAISE NOTICE 'Scheduled cleanup_floq_boosts cron job';
  ELSE
    RAISE NOTICE 'pg_cron not available, skipping cleanup job scheduling';
  END IF;
END;
$$;

-- 9. GRANT EXECUTE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.get_active_floqs_with_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_floq_boosts TO authenticated;
