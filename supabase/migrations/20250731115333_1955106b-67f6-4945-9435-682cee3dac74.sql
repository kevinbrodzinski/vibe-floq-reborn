-- Fix RLS policies and database functions for relationship tracking and friends system

-- 1. Ensure bulk_upsert_relationships function exists and works with user_a_id/user_b_id
CREATE OR REPLACE FUNCTION public.bulk_upsert_relationships(relationship_pairs jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pair_count integer := 0;
  pair_item jsonb;
BEGIN
  -- Validate input
  IF relationship_pairs IS NULL OR jsonb_array_length(relationship_pairs) = 0 THEN
    RETURN 0;
  END IF;

  -- Process each relationship pair
  FOR pair_item IN SELECT * FROM jsonb_array_elements(relationship_pairs)
  LOOP
    -- Ensure deterministic ordering (smaller UUID first)
    INSERT INTO public.flock_relationships (
      user_a_id, 
      user_b_id, 
      proximity_meters, 
      shared_vibe, 
      venue_id, 
      last_interaction_at,
      interaction_count
    )
    VALUES (
      LEAST((pair_item->>'user_a_id')::uuid, (pair_item->>'user_b_id')::uuid),
      GREATEST((pair_item->>'user_a_id')::uuid, (pair_item->>'user_b_id')::uuid),
      COALESCE((pair_item->>'proximity_meters')::integer, 100),
      pair_item->>'shared_vibe',
      (pair_item->>'venue_id')::uuid,
      now(),
      1
    )
    ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET
      proximity_meters = EXCLUDED.proximity_meters,
      shared_vibe = COALESCE(EXCLUDED.shared_vibe, flock_relationships.shared_vibe),
      venue_id = COALESCE(EXCLUDED.venue_id, flock_relationships.venue_id),
      last_interaction_at = now(),
      interaction_count = flock_relationships.interaction_count + 1,
      relationship_strength = LEAST(1.0, flock_relationships.relationship_strength + 0.1);
    
    pair_count := pair_count + 1;
  END LOOP;

  RETURN pair_count;
END;
$function$;

-- 2. Ensure people_crossed_paths_today function exists and returns correct format
CREATE OR REPLACE FUNCTION public.people_crossed_paths_today(
  in_me uuid DEFAULT auth.uid(),
  proximity_meters integer DEFAULT 25
)
RETURNS TABLE(
  profile_id uuid,
  username text,
  display_name text,
  avatar_url text,
  last_seen_at timestamptz,
  distance_meters integer,
  overlap_duration_minutes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Return crossed paths from today based on the crossed_paths table
  RETURN QUERY
  SELECT 
    CASE 
      WHEN cp.user_a = in_me THEN cp.user_b
      ELSE cp.user_a
    END as profile_id,
    p.username,
    p.display_name,
    p.avatar_url,
    cp.ts as last_seen_at,
    25 as distance_meters,  -- Default value since we don't store exact distances
    30 as overlap_duration_minutes  -- Default value
  FROM public.crossed_paths cp
  JOIN public.profiles p ON (
    CASE 
      WHEN cp.user_a = in_me THEN cp.user_b
      ELSE cp.user_a
    END = p.id
  )
  WHERE 
    (cp.user_a = in_me OR cp.user_b = in_me)
    AND cp.encounter_date = CURRENT_DATE
    AND CASE 
      WHEN cp.user_a = in_me THEN cp.user_b
      ELSE cp.user_a
    END != in_me;
END;
$function$;

-- 3. Fix RLS policies for flock_relationships table
DROP POLICY IF EXISTS "Edge function can insert relationships" ON public.flock_relationships;
DROP POLICY IF EXISTS "Edge function can update relationships" ON public.flock_relationships;
DROP POLICY IF EXISTS "Users can view their own relationships" ON public.flock_relationships;

CREATE POLICY "service_role_manage_relationships" ON public.flock_relationships
  FOR ALL USING (
    current_setting('role') = 'service_role' OR
    auth.uid() = user_a_id OR 
    auth.uid() = user_b_id
  )
  WITH CHECK (
    current_setting('role') = 'service_role' OR
    auth.uid() = user_a_id OR 
    auth.uid() = user_b_id
  );

-- 4. Fix RLS policies for friendships table  
DROP POLICY IF EXISTS "friends_read" ON public.friendships;

CREATE POLICY "friendships_read" ON public.friendships
  FOR SELECT USING (
    auth.uid() = user_low OR 
    auth.uid() = user_high
  );

-- 5. Fix RLS policies for crossed_paths table
DROP POLICY IF EXISTS "Users can view their own crossed paths" ON public.crossed_paths;

CREATE POLICY "crossed_paths_read" ON public.crossed_paths
  FOR SELECT USING (
    auth.uid() = user_a OR 
    auth.uid() = user_b
  );

CREATE POLICY "crossed_paths_service_write" ON public.crossed_paths
  FOR INSERT WITH CHECK (
    current_setting('role') = 'service_role'
  );

-- 6. Fix RLS policies for user_encounter table
DROP POLICY IF EXISTS "user_encounter_read" ON public.user_encounter;
DROP POLICY IF EXISTS "user_encounter_write" ON public.user_encounter;

CREATE POLICY "user_encounter_read" ON public.user_encounter
  FOR SELECT USING (
    auth.uid() = user_a OR 
    auth.uid() = user_b
  );

CREATE POLICY "user_encounter_service_write" ON public.user_encounter
  FOR INSERT WITH CHECK (
    current_setting('role') = 'service_role'
  );

-- 7. Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_flock_relationships_users ON public.flock_relationships(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(user_low, user_high);
CREATE INDEX IF NOT EXISTS idx_crossed_paths_users ON public.crossed_paths(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_crossed_paths_date ON public.crossed_paths(encounter_date);
CREATE INDEX IF NOT EXISTS idx_user_encounter_users ON public.user_encounter(user_a, user_b);

-- 8. Ensure RLS is enabled on all tables
ALTER TABLE public.flock_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crossed_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_encounter ENABLE ROW LEVEL SECURITY;