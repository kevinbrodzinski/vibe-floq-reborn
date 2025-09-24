-- Progressive Vibe Auto-Update Schema Migration (Fixed)
-- Enhanced SQL functions with performance, security, and type safety

-- Create enhanced bulk relationship upsert function
CREATE OR REPLACE FUNCTION public.bulk_upsert_relationships(relationship_pairs jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Single statement bulk upsert using MERGE pattern
  INSERT INTO public.flock_relationships (user_a_id, user_b_id, interaction_count, last_interaction_at)
  SELECT 
    LEAST((pair->>'user_a_id')::uuid, (pair->>'user_b_id')::uuid) as user_a_id,
    GREATEST((pair->>'user_a_id')::uuid, (pair->>'user_b_id')::uuid) as user_b_id,
    1 as interaction_count,
    now() as last_interaction_at
  FROM jsonb_array_elements(relationship_pairs) as pair
  WHERE (pair->>'user_a_id')::uuid IS DISTINCT FROM (pair->>'user_b_id')::uuid
  ON CONFLICT (user_a_id, user_b_id) 
  DO UPDATE SET
    interaction_count = flock_relationships.interaction_count + 1,
    last_interaction_at = now();
    
  GET DIAGNOSTICS result_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true, 
    'processed_pairs', total_pairs,
    'relationships_updated', result_count
  );
END;
$$;

-- Create enhanced floq activity score calculation
CREATE OR REPLACE FUNCTION public.calculate_floq_activity_score(
  p_floq_id uuid,
  p_event_type text,
  p_proximity_boost integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_count integer := 0;
  hours_since_start numeric := 0;
  new_score numeric := 0;
  event_multiplier numeric := 1.0;
BEGIN
  -- Validate event type
  IF p_event_type NOT IN ('join', 'leave', 'vibe_change', 'proximity_update') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid event type');
  END IF;

  -- Count current participants
  SELECT COUNT(*) INTO participant_count
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id;
  
  -- Calculate hours since floq started
  SELECT GREATEST(0, EXTRACT(EPOCH FROM (now() - f.starts_at)) / 3600.0)
  INTO hours_since_start
  FROM public.floqs f
  WHERE f.id = p_floq_id;
  
  -- Set event multiplier
  event_multiplier := CASE p_event_type
    WHEN 'join' THEN 1.5
    WHEN 'vibe_change' THEN 1.2
    WHEN 'proximity_update' THEN 1.1
    WHEN 'leave' THEN 0.9
    ELSE 1.0
  END;
  
  -- Calculate new activity score with exponential decay
  new_score := LEAST(
    100.0,
    (participant_count * 10.0 + COALESCE(p_proximity_boost, 0) * 2.0) 
    * event_multiplier 
    * EXP(-hours_since_start / 24.0)
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
    'hours_since_start', hours_since_start
  );
END;
$$;

-- Create enhanced floq suggestions generator
CREATE OR REPLACE FUNCTION public.generate_floq_suggestions(
  p_user_id uuid,
  p_user_lat numeric,
  p_user_lng numeric,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  floq_id uuid,
  title text,
  primary_vibe vibe_enum,
  distance_meters numeric,
  participant_count bigint,
  confidence_score numeric,
  reasoning jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    -- Confidence score based on distance, activity, and interest alignment
    ROUND(
      (1.0 - LEAST(nf.distance_m / 1500.0, 1.0)) * 0.4 +  -- Distance factor
      (nf.activity_score / 100.0) * 0.3 +  -- Activity factor
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
      'activity_factor', ROUND(nf.activity_score / 100.0, 3),
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
$$;

-- Create enhanced friend suggestions generator
CREATE OR REPLACE FUNCTION public.generate_friend_suggestions(
  p_user_id uuid,
  p_user_lat numeric,
  p_user_lng numeric,
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  username citext,
  display_name text,
  avatar_url text,
  confidence_score numeric,
  reasoning jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_context AS (
    SELECT interests
    FROM public.profiles 
    WHERE id = p_user_id
    LIMIT 1
  ),
  potential_friends AS (
    SELECT DISTINCT p.id, p.username, p.display_name, p.avatar_url, p.interests
    FROM public.profiles p
    WHERE p.id != p_user_id
      AND p.id NOT IN (
        SELECT friend_id FROM public.friendships WHERE user_id = p_user_id
        UNION
        SELECT user_id FROM public.friendships WHERE friend_id = p_user_id
      )
      AND p.username IS NOT NULL
    LIMIT 50  -- Pre-filter for performance
  )
  SELECT 
    pf.id as user_id,
    pf.username,
    pf.display_name,
    pf.avatar_url,
    -- Confidence score based on shared interests and mutual connections
    ROUND(
      CASE 
        WHEN uc.interests IS NOT NULL AND pf.interests IS NOT NULL 
        THEN (
          2.0 * COALESCE(
            array_length(
              ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(pf.interests)), 1
            ), 0
          )::numeric / GREATEST(
            array_length(uc.interests, 1) + array_length(pf.interests, 1), 1
          )
        )
        ELSE 0.1
      END, 3
    ) as confidence_score,
    jsonb_build_object(
      'shared_interests', COALESCE(
        ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(pf.interests)), 
        ARRAY[]::text[]
      ),
      'interest_similarity', CASE 
        WHEN uc.interests IS NOT NULL AND pf.interests IS NOT NULL 
        THEN ROUND(
          2.0 * COALESCE(
            array_length(
              ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(pf.interests)), 1
            ), 0
          )::numeric / GREATEST(
            array_length(uc.interests, 1) + array_length(pf.interests, 1), 1
          ), 3
        )
        ELSE 0.0
      END
    ) as reasoning
  FROM potential_friends pf
  CROSS JOIN user_context uc
  WHERE (
    uc.interests IS NOT NULL AND pf.interests IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM unnest(uc.interests) ui
      WHERE ui = ANY(pf.interests)
    )
  )
  ORDER BY confidence_score DESC
  LIMIT p_limit;
END;
$$;

-- Create enhanced cleanup function for inactive floqs
CREATE OR REPLACE FUNCTION public.cleanup_inactive_floqs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_floqs integer := 0;
  cleaned_suggestions integer := 0;
BEGIN
  -- Mark inactive floqs (ended + no activity + low score)
  UPDATE public.floqs 
  SET 
    activity_score = 0,
    updated_at = now()
  WHERE ends_at < now() - interval '1 hour'
    AND activity_score > 0
    AND (
      last_activity_at < now() - interval '2 hours' 
      OR activity_score < 5.0
    );
    
  GET DIAGNOSTICS cleaned_floqs = ROW_COUNT;
  
  -- Clean expired suggestions
  DELETE FROM public.flock_auto_suggestions 
  WHERE expires_at < now() 
    OR status = 'expired';
    
  GET DIAGNOSTICS cleaned_suggestions = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleaned_floqs', cleaned_floqs,
    'cleaned_suggestions', cleaned_suggestions,
    'timestamp', now()
  );
END;
$$;

-- Create suggestion metrics update function
CREATE OR REPLACE FUNCTION public.update_suggestion_metrics(
  p_user_id uuid,
  p_suggestion_type suggestion_type_enum,
  p_action text,
  p_suggestion_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  metric_result jsonb;
BEGIN
  -- Validate action type
  IF p_action NOT IN ('generated', 'viewed', 'accepted', 'dismissed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid action type');
  END IF;

  -- Update suggestion status if suggestion_id provided
  IF p_suggestion_id IS NOT NULL THEN
    UPDATE public.flock_auto_suggestions
    SET 
      status = CASE p_action
        WHEN 'accepted' THEN 'accepted'::suggestion_status_enum
        WHEN 'dismissed' THEN 'dismissed'::suggestion_status_enum
        ELSE status
      END,
      updated_at = now()
    WHERE id = p_suggestion_id AND user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'suggestion_type', p_suggestion_type,
    'timestamp', now()
  );
END;
$$;

-- Create performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_interests_gin 
ON public.profiles USING gin(interests);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_tags_gin 
ON public.floqs USING gin(flock_tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_location_gist 
ON public.floqs USING gist(location);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_activity_composite 
ON public.floqs (activity_score DESC, ends_at DESC, visibility) 
WHERE ends_at > now();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flock_relationships_strength 
ON public.flock_relationships (relationship_strength DESC, last_interaction_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibes_now_location_gist 
ON public.vibes_now USING gist(location) 
WHERE expires_at > now();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.bulk_upsert_relationships TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_floq_activity_score TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_floq_suggestions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_friend_suggestions TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_inactive_floqs TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_suggestion_metrics TO authenticated, service_role;