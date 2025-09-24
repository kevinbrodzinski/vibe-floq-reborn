-- Final patch: missing indexes, high-resolution decay, and enum overload with permissions

-- 1. High-resolution time delta in relationship strength
CREATE OR REPLACE FUNCTION public.bulk_upsert_relationships(relationship_pairs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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

  -- Single statement bulk upsert with high-resolution relationship strength calculation
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
      EXTRACT(EPOCH FROM (now() - flock_relationships.last_interaction_at))/86400.0
    );
    
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true, 
    'processed_pairs', total_pairs,
    'relationships_updated', result_count
  );
END;
$$;

-- 2. Re-create missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_interests_gin
  ON public.profiles USING gin(interests);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibes_now_location_gist
  ON public.vibes_now USING gist(location);

-- 3. Create strongly-typed enum overload for backward compatibility
CREATE OR REPLACE FUNCTION public.calculate_floq_activity_score(
  p_floq_id uuid,
  p_event_type flock_event_type_enum,
  p_proximity_boost integer DEFAULT 0,
  p_decay_hours numeric DEFAULT 24.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  participant_count integer := 0;
  hours_since_start numeric := 0;
  new_score numeric := 0;
  event_multiplier numeric := 1.0;
BEGIN
  -- Count current participants
  SELECT COUNT(*) INTO participant_count
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id;
  
  -- Calculate hours since floq started
  SELECT GREATEST(0, EXTRACT(EPOCH FROM (now() - f.starts_at)) / 3600.0)
  INTO hours_since_start
  FROM public.floqs f
  WHERE f.id = p_floq_id;
  
  -- Set event multiplier based on enum
  event_multiplier := CASE p_event_type
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
    'event_type', p_event_type::text
  );
END;
$$;

-- Update the text overload to use the enum version for type safety
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
AS $$
DECLARE
  mapped_event_type flock_event_type_enum;
BEGIN
  -- Map text event types to enum values
  mapped_event_type := CASE p_event_type
    WHEN 'join' THEN 'joined'::flock_event_type_enum
    WHEN 'leave' THEN 'left'::flock_event_type_enum
    WHEN 'vibe_change' THEN 'vibe_changed'::flock_event_type_enum
    WHEN 'proximity_update' THEN 'activity_detected'::flock_event_type_enum
    ELSE 'activity_detected'::flock_event_type_enum
  END;
  
  -- Delegate to the strongly-typed version
  RETURN public.calculate_floq_activity_score(
    p_floq_id,
    mapped_event_type,
    p_proximity_boost,
    p_decay_hours
  );
END;
$$;

-- 4. Grant permissions for both overloads to service_role
GRANT EXECUTE ON FUNCTION public.calculate_floq_activity_score(uuid, flock_event_type_enum, integer, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_floq_activity_score(uuid, text, integer, numeric) TO service_role;