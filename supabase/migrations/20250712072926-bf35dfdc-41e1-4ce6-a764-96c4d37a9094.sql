-- Phase 1A: Critical Database Schema Fixes for Hardened Boost System

-- Drop and recreate floq_boosts table with proper constraints
DROP TABLE IF EXISTS public.floq_boosts CASCADE;

CREATE TABLE public.floq_boosts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floq_id uuid NOT NULL,
  user_id uuid NOT NULL,
  boost_type text NOT NULL DEFAULT 'vibe',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '1 hour'),
  
  -- Foreign key constraints with CASCADE DELETE
  CONSTRAINT fk_floq_boosts_floq 
    FOREIGN KEY (floq_id) REFERENCES public.floqs(id) ON DELETE CASCADE,
  CONSTRAINT fk_floq_boosts_user 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    
  -- Simple unique constraint without time predicate (race-condition safe)
  CONSTRAINT uq_floq_boost_active 
    UNIQUE (floq_id, user_id, boost_type)
);

-- Performance indexes
CREATE INDEX idx_floq_boosts_count 
  ON public.floq_boosts (floq_id) 
  WHERE expires_at > now();

CREATE INDEX idx_floq_boosts_cleanup 
  ON public.floq_boosts (expires_at);

CREATE INDEX idx_floq_boosts_user_rate_limit 
  ON public.floq_boosts (user_id, created_at) 
  WHERE expires_at > now();

-- Enable RLS
ALTER TABLE public.floq_boosts ENABLE ROW LEVEL SECURITY;

-- Race-condition safe RLS policies
CREATE POLICY "boost: self_insert" 
  ON public.floq_boosts 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "boost: visible_active" 
  ON public.floq_boosts 
  FOR SELECT 
  USING (expires_at > now());

CREATE POLICY "boost: self_delete" 
  ON public.floq_boosts 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Enable realtime
ALTER TABLE public.floq_boosts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_boosts;

-- Update cleanup function for 1-hour expiry
CREATE OR REPLACE FUNCTION public.cleanup_expired_floq_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Clean up boosts expired for more than 5 minutes (1 hour + 5 minute buffer)
  DELETE FROM public.floq_boosts 
  WHERE expires_at < now() - interval '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Update active floqs function to use 1-hour boost counting
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_user_lat numeric DEFAULT NULL::numeric, p_user_lng numeric DEFAULT NULL::numeric)
RETURNS TABLE(id uuid, title text, name text, primary_vibe vibe_enum, vibe_tag vibe_enum, type text, starts_at timestamp with time zone, ends_at timestamp with time zone, participant_count bigint, boost_count bigint, starts_in_min integer, distance_meters numeric, members jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
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
    AND fb.expires_at > now()  -- 1-hour active window
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
$$;