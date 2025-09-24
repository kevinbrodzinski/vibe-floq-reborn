-- Optimized Schema Migration - Production Ready
-- Addresses: enum mapping, relationship strength, GIST optimization, security hardening

-- 1. GRANT EXECUTE permissions for helper function
GRANT EXECUTE ON FUNCTION public.calculate_relationship_strength(integer, numeric) TO service_role;

-- 2. Drop and recreate functions with proper enum mapping and restored functionality
DROP FUNCTION IF EXISTS public.bulk_upsert_relationships(jsonb);
CREATE OR REPLACE FUNCTION public.bulk_upsert_relationships(relationship_pairs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result_count integer := 0;
  total_pairs integer := 0;
BEGIN
  -- Validate input
  IF relationship_pairs IS NULL OR jsonb_typeof(relationship_pairs) != 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid input: expected JSON array');
  END IF;

  total_pairs := jsonb_array_length(relationship_pairs);
  
  -- Limit to prevent DoS
  IF total_pairs > 1000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many pairs: maximum 1000 allowed');
  END IF;

  -- Single statement bulk upsert with relationship strength calculation
  INSERT INTO public.flock_relationships (user_a_id, user_b_id, interaction_count, last_interaction_at, relationship_strength)
  SELECT 
    LEAST((pair->>'user_a_id')::uuid, (pair->>'user_b_id')::uuid) as user_a_id,
    GREATEST((pair->>'user_a_id')::uuid, (pair->>'user_b_id')::uuid) as user_b_id,
    1 as interaction_count,
    now() as last_interaction_at,
    public.calculate_relationship_strength(1, 0) as relationship_strength
  FROM jsonb_array_elements(relationship_pairs) as pair
  WHERE (pair->>'user_a_id')::uuid IS DISTINCT FROM (pair->>'user_b_id')::uuid
  ON CONFLICT (user_a_id, user_b_id) 
  DO UPDATE SET
    interaction_count = flock_relationships.interaction_count + 1,
    last_interaction_at = now(),
    relationship_strength = public.calculate_relationship_strength(
      flock_relationships.interaction_count + 1,
      EXTRACT(DAYS FROM (now() - flock_relationships.last_interaction_at))
    );
    
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true, 
    'processed_pairs', total_pairs,
    'relationships_updated', result_count
  );
END;
$function$;

-- 3. Update calculate_floq_activity_score with proper enum mapping and configurable decay
DROP FUNCTION IF EXISTS public.calculate_floq_activity_score(uuid, text, integer);
CREATE OR REPLACE FUNCTION public.calculate_floq_activity_score(
  p_floq_id uuid, 
  p_event_type text, 
  p_proximity_boost integer DEFAULT 0,
  p_decay_hours numeric DEFAULT 24.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  participant_count integer := 0;
  hours_since_start numeric := 0;
  new_score numeric := 0;
  event_multiplier numeric := 1.0;
  mapped_event_type flock_event_type_enum;
BEGIN
  -- Map text event types to existing enum values
  mapped_event_type := CASE p_event_type
    WHEN 'join' THEN 'joined'::flock_event_type_enum
    WHEN 'leave' THEN 'left'::flock_event_type_enum
    WHEN 'vibe_change' THEN 'vibe_changed'::flock_event_type_enum
    WHEN 'proximity_update' THEN 'activity_detected'::flock_event_type_enum
    ELSE 'activity_detected'::flock_event_type_enum -- Default fallback
  END;

  -- Count current participants
  SELECT COUNT(*) INTO participant_count
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id;
  
  -- Calculate hours since floq started
  SELECT GREATEST(0, EXTRACT(EPOCH FROM (now() - f.starts_at)) / 3600.0)
  INTO hours_since_start
  FROM public.floqs f
  WHERE f.id = p_floq_id;
  
  -- Set event multiplier based on mapped enum
  event_multiplier := CASE mapped_event_type
    WHEN 'joined' THEN 1.5
    WHEN 'vibe_changed' THEN 1.2
    WHEN 'activity_detected' THEN 1.1
    WHEN 'left' THEN 0.9
    ELSE 1.0
  END;
  
  -- Calculate new activity score with configurable exponential decay
  new_score := LEAST(
    100.0,
    (participant_count * 10.0 + COALESCE(p_proximity_boost, 0) * 2.0) 
    * event_multiplier 
    * EXP(-hours_since_start / p_decay_hours)
  );
  
  -- Update the floq
  UPDATE public.floqs 
  SET 
    activity_score = new_score,
    last_activity_at = now()
  WHERE id = p_floq_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_score', new_score,
    'participant_count', participant_count,
    'hours_since_start', hours_since_start,
    'event_type', mapped_event_type::text
  );
END;
$function$;

-- 4. Optimize GIST indexes - Split composite index into specialized ones
DROP INDEX CONCURRENTLY IF EXISTS idx_floqs_location_visibility_time;
DROP INDEX CONCURRENTLY IF EXISTS idx_floqs_location;
DROP INDEX CONCURRENTLY IF EXISTS idx_floqs_ends_at_public;

-- Create optimized separate indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_location_gist 
ON public.floqs USING GIST (location) 
WHERE ends_at > now();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_public_ends_at 
ON public.floqs (ends_at) 
WHERE visibility = 'public' AND ends_at > now();

-- 5. Deduplication - Drop potentially duplicate indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_flock_relationships_strength;
DROP INDEX CONCURRENTLY IF EXISTS idx_flock_auto_suggestions_user_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_floqs_activity_location;

-- Create optimized indexes with conflict handling
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flock_relationships_strength_composite
ON public.flock_relationships (relationship_strength DESC, last_interaction_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flock_suggestions_user_expires
ON public.flock_auto_suggestions (user_id, expires_at DESC) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_activity_score_desc
ON public.floqs (activity_score DESC, starts_at)
WHERE visibility = 'public' AND ends_at > now();

-- 6. Update suggestion functions with SECURITY INVOKER for RLS safety
DROP FUNCTION IF EXISTS public.generate_floq_suggestions(uuid, numeric, numeric, integer);
CREATE OR REPLACE FUNCTION public.generate_floq_suggestions(
  p_user_id uuid, 
  p_user_lat numeric, 
  p_user_lng numeric, 
  p_limit integer DEFAULT 3
)
RETURNS TABLE(floq_id uuid, title text, primary_vibe vibe_enum, distance_meters numeric, participant_count bigint, confidence_score numeric, reasoning jsonb)
LANGUAGE plpgsql
SECURITY INVOKER  -- Respect caller's RLS
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate input limits to prevent DoS
  p_limit := LEAST(GREATEST(p_limit, 1), 10);
  
  RETURN QUERY
  WITH user_context AS (
    SELECT interests, display_name
    FROM public.profiles 
    WHERE id = p_user_id
    LIMIT 1
  ),
  nearby_floqs AS (
    SELECT 
      f.id,
      f.title,
      f.primary_vibe,
      f.flock_tags,
      ST_Distance(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
      )::numeric as distance_m,
      f.activity_score
    FROM public.floqs f
    WHERE f.ends_at > now()
      AND f.visibility = 'public'
      AND ST_DWithin(
        f.location::geography,
        ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography,
        1500  -- 1.5km max
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.floq_participants fp 
        WHERE fp.floq_id = f.id AND fp.user_id = p_user_id
      )
    ORDER BY distance_m
    LIMIT 20  -- Pre-filter for performance
  )
  SELECT 
    nf.id as floq_id,
    nf.title,
    nf.primary_vibe,
    nf.distance_m as distance_meters,
    COALESCE(pc.participant_count, 0) as participant_count,
    -- Enhanced confidence scoring
    ROUND(
      (1.0 - LEAST(nf.distance_m / 1500.0, 1.0)) * 0.4 +  -- Distance factor
      (COALESCE(nf.activity_score, 0) / 100.0) * 0.3 +  -- Activity factor
      CASE 
        WHEN uc.interests IS NOT NULL AND nf.flock_tags IS NOT NULL 
        THEN (
          COALESCE(
            array_length(
              ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(nf.flock_tags)), 1
            ), 0
          )::numeric / GREATEST(array_length(uc.interests, 1), 1)
        ) * 0.3
        ELSE 0.0
      END, 3  -- Interest alignment factor
    ) as confidence_score,
    jsonb_build_object(
      'distance_factor', ROUND(1.0 - LEAST(nf.distance_m / 1500.0, 1.0), 3),
      'activity_factor', ROUND(COALESCE(nf.activity_score, 0) / 100.0, 3),
      'shared_interests', COALESCE(
        ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(nf.flock_tags)), 
        ARRAY[]::text[]
      )
    ) as reasoning
  FROM nearby_floqs nf
  CROSS JOIN user_context uc
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as participant_count
    FROM public.floq_participants fp
    WHERE fp.floq_id = nf.id
  ) pc ON true
  ORDER BY confidence_score DESC
  LIMIT p_limit;
END;
$function$;

-- 7. Grant permissions to service_role only for core functions
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_relationships(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_floq_activity_score(uuid, text, integer, numeric) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.bulk_upsert_relationships(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_floq_activity_score(uuid, text, integer, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_floq_suggestions(uuid, numeric, numeric, integer) TO authenticated, service_role;