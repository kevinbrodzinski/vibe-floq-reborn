-- Fix RLS policies and database functions for relationship tracking and friends system

-- 1. Drop and recreate bulk_upsert_relationships function with correct signature
DROP FUNCTION IF EXISTS public.bulk_upsert_relationships(jsonb);

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
      last_interaction_at,
      interaction_count
    )
    VALUES (
      LEAST((pair_item->>'user_a_id')::uuid, (pair_item->>'user_b_id')::uuid),
      GREATEST((pair_item->>'user_a_id')::uuid, (pair_item->>'user_b_id')::uuid),
      now(),
      1
    )
    ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET
      last_interaction_at = now(),
      interaction_count = flock_relationships.interaction_count + 1,
      relationship_strength = LEAST(1.0, flock_relationships.relationship_strength + 0.1);
    
    pair_count := pair_count + 1;
  END LOOP;

  RETURN pair_count;
END;
$function$;

-- 2. Drop and recreate people_crossed_paths_today function with correct signature  
DROP FUNCTION IF EXISTS public.people_crossed_paths_today(uuid, integer);

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

-- 3. Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_flock_relationships_users ON public.flock_relationships(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(user_low, user_high);
CREATE INDEX IF NOT EXISTS idx_crossed_paths_users ON public.crossed_paths(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_crossed_paths_date ON public.crossed_paths(encounter_date);
CREATE INDEX IF NOT EXISTS idx_user_encounter_users ON public.user_encounter(user_a, user_b);

-- 4. Ensure RLS is enabled on all tables
ALTER TABLE public.flock_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crossed_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_encounter ENABLE ROW LEVEL SECURITY;