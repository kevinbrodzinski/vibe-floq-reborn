-- Apply PostgreSQL best practices improvements
SET search_path = public, pg_catalog;

-- 1️⃣ Enhanced get_floq_plans_enhanced with proper volatility and comments
CREATE OR REPLACE FUNCTION public.get_floq_plans_enhanced(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status plan_status_enum,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  creator_id uuid,
  floq_id uuid,
  participant_count bigint,
  user_rsvp_status rsvp_status_enum
)
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id,
    fp.title,
    fp.description,
    fp.status,
    fp.starts_at,
    fp.ends_at,
    fp.created_at,
    fp.updated_at,
    fp.creator_id,
    fp.floq_id,
    COALESCE(pc.participant_count, 0) as participant_count,
    COALESCE(pp.rsvp_status, 'pending'::rsvp_status_enum) as user_rsvp_status
  FROM floq_plans fp
  LEFT JOIN (
    SELECT plan_id, COUNT(*) as participant_count
    FROM plan_participants
    GROUP BY plan_id
  ) pc ON pc.plan_id = fp.id
  LEFT JOIN plan_participants pp ON pp.plan_id = fp.id AND pp.profile_id = p_profile_id
  WHERE EXISTS (
    SELECT 1 FROM plan_participants pp2 
    WHERE pp2.plan_id = fp.id AND pp2.profile_id = p_profile_id
  )
  ORDER BY fp.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_floq_plans_enhanced(uuid)
  IS 'Return plans the user participates in, with participant counts and user RSVP status';

-- 2️⃣ Enhanced create_group_plan_with_floq with better defaults and error handling
CREATE OR REPLACE FUNCTION public.create_group_plan_with_floq(
  p_title text,
  p_description text DEFAULT NULL,
  p_starts_at timestamptz DEFAULT now(),
  p_ends_at timestamptz DEFAULT now() + interval '2 hours',
  p_floq_title text DEFAULT NULL,
  p_floq_description text DEFAULT NULL
)
RETURNS TABLE(plan_id uuid, floq_id uuid)
LANGUAGE plpgsql VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_plan_id uuid;
  new_floq_id uuid;
  creator_id uuid := auth.uid();
BEGIN
  IF creator_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Create the floq first
  INSERT INTO floqs (
    title,
    description,
    creator_id,
    status,
    starts_at,
    ends_at,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_floq_title, p_title),
    COALESCE(p_floq_description, p_description),
    creator_id,
    'active',
    p_starts_at,
    p_ends_at,
    now(),
    now()
  ) RETURNING id INTO new_floq_id;

  IF new_floq_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create floq';
  END IF;

  -- Create the plan
  INSERT INTO floq_plans (
    title,
    description,
    creator_id,
    floq_id,
    status,
    starts_at,
    ends_at,
    created_at,
    updated_at
  ) VALUES (
    p_title,
    p_description,
    creator_id,
    new_floq_id,
    'draft',
    p_starts_at,
    p_ends_at,
    now(),
    now()
  ) RETURNING id INTO new_plan_id;

  IF new_plan_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create plan';
  END IF;

  -- Add creator as participant
  INSERT INTO plan_participants (plan_id, profile_id, rsvp_status, created_at)
  VALUES (new_plan_id, creator_id, 'attending', now());

  RETURN QUERY SELECT new_plan_id, new_floq_id;
END;
$$;

COMMENT ON FUNCTION public.create_group_plan_with_floq(text, text, timestamptz, timestamptz, text, text)
  IS 'Creates a Floq + draft plan in one call; returns both IDs';

-- Grant permissions with proper signatures
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.get_floq_plans_enhanced(uuid) TO authenticated;
EXCEPTION WHEN undefined_function THEN
  -- Function doesn't exist yet, skip
END;
$$;

DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.create_group_plan_with_floq(text, text, timestamptz, timestamptz, text, text) TO authenticated;
EXCEPTION WHEN undefined_function THEN
  -- Function doesn't exist yet, skip
END;
$$;

-- Ensure helpful index exists for participant counts
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON plan_participants(plan_id);