-- Phase 3B: Corrected Floq Boosts System
-- This migration creates a complete boost system with proper indexing and cleanup

-- Create floq_boosts table
CREATE TABLE IF NOT EXISTS public.floq_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floq_id UUID NOT NULL REFERENCES public.floqs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  boost_type TEXT NOT NULL DEFAULT 'vibe',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '4 hours'),
  
  -- Prevent duplicate boosts
  UNIQUE(floq_id, user_id, boost_type)
);

-- Enable RLS
ALTER TABLE public.floq_boosts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own boosts" 
ON public.floq_boosts 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view boosts for visible floqs" 
ON public.floq_boosts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.floqs f 
    WHERE f.id = floq_boosts.floq_id 
    AND f.visibility = 'public' 
    AND f.ends_at > now()
  )
);

CREATE POLICY "Users can delete their own boosts" 
ON public.floq_boosts 
FOR DELETE 
USING (user_id = auth.uid());

-- Performance indexes (using static predicates)
CREATE INDEX idx_floq_boosts_lookup ON public.floq_boosts(floq_id, user_id, boost_type);
CREATE INDEX idx_floq_boosts_active ON public.floq_boosts(floq_id) WHERE boost_type = 'vibe';
CREATE INDEX idx_floq_boosts_cleanup ON public.floq_boosts(expires_at);

-- Enable realtime
ALTER TABLE public.floq_boosts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_boosts;

-- Update get_active_floqs_with_members to include boost counts and distance
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
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  participant_count BIGINT,
  boost_count BIGINT,
  starts_in_min INTEGER,
  distance_meters NUMERIC,
  members JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
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
    COALESCE(participants.participant_count, 0) AS participant_count,
    COALESCE(boosts.boost_count, 0) AS boost_count,
    GREATEST(0, EXTRACT(EPOCH FROM (f.starts_at - now()))/60)::int AS starts_in_min,
    CASE 
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
      THEN ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
      )
      ELSE NULL
    END AS distance_meters,
    COALESCE(members.members, '[]'::jsonb) AS members
  FROM public.floqs f
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = f.id
  ) participants ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS boost_count
    FROM public.floq_boosts fb
    WHERE fb.floq_id = f.id 
    AND fb.boost_type = 'vibe'
    AND fb.expires_at > now()
  ) boosts ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'avatar_url', p.avatar_url,
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name
    ) ORDER BY fp.joined_at DESC) AS members
    FROM public.floq_participants fp
    JOIN public.profiles p ON p.id = fp.user_id
    WHERE fp.floq_id = f.id
    LIMIT 8
  ) members ON TRUE
  WHERE f.ends_at > now()
    AND f.visibility = 'public'
  ORDER BY 
    CASE 
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
      THEN ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
      )
      ELSE 0
    END,
    boosts.boost_count DESC,
    f.starts_at
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Cleanup function for expired boosts
CREATE OR REPLACE FUNCTION public.cleanup_expired_floq_boosts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.floq_boosts 
  WHERE expires_at < now() - interval '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- Idempotent cron job scheduling for cleanup
DO $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule('cleanup-expired-floq-boosts') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-floq-boosts'
  );
  
  -- Schedule cleanup every 15 minutes
  PERFORM cron.schedule(
    'cleanup-expired-floq-boosts',
    '*/15 * * * *',
    'SELECT cleanup_expired_floq_boosts();'
  );
EXCEPTION
  WHEN undefined_table THEN
    -- pg_cron extension not available, skip scheduling
    NULL;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_active_floqs_with_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_floq_boosts TO authenticated;