-- Improve Floq-Plan Integration
-- This migration enhances the relationship between floqs and plans

-- 1. Add indexes for better floq-plan query performance
CREATE INDEX IF NOT EXISTS idx_floq_plans_floq_id_status 
ON floq_plans(floq_id, status) 
WHERE floq_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_floq_plans_creator_floq 
ON floq_plans(creator_id, floq_id) 
WHERE floq_id IS NOT NULL;

-- 2. Add constraint to ensure plans created within floqs have floq_id
-- Note: We don't make it NOT NULL yet to maintain compatibility
-- But we add a check constraint for new plans
ALTER TABLE floq_plans 
ADD CONSTRAINT check_floq_plan_consistency 
CHECK (
  -- If plan_mode is 'group', floq_id should be present
  (plan_mode = 'group' AND floq_id IS NOT NULL) OR 
  -- Solo plans can have null floq_id
  (plan_mode = 'solo') OR
  -- Default mode plans are flexible
  (plan_mode = 'default')
);

-- 3. Create a function to automatically create floq when creating group plans without floq_id
CREATE OR REPLACE FUNCTION ensure_floq_for_group_plan()
RETURNS TRIGGER AS $$
DECLARE
  new_floq_id UUID;
  plan_location GEOMETRY;
  plan_vibe TEXT;
BEGIN
  -- If it's a group plan without floq_id, create a floq
  IF NEW.plan_mode = 'group' AND NEW.floq_id IS NULL THEN
    -- Extract location from plan
    plan_location := NEW.location;
    
    -- Determine primary vibe from plan vibe_tags
    plan_vibe := COALESCE(NEW.vibe_tags[1], 'social');
    
    -- Create a new floq for this plan
    INSERT INTO floqs (
      title,
      description,
      primary_vibe,
      creator_id,
      profile_id,
      location,
      geo,
      starts_at,
      ends_at,
      max_participants,
      auto_created
    ) VALUES (
      NEW.title || ' Group',
      'Auto-created floq for group plan: ' || COALESCE(NEW.description, NEW.title),
      plan_vibe::vibe_enum,
      NEW.creator_id,
      NEW.profile_id,
      plan_location,
      CASE 
        WHEN plan_location IS NOT NULL 
        THEN ST_GeomFromGeoJSON(plan_location::text)::geography
        ELSE NULL 
      END,
      NEW.start_time::timestamptz,
      NEW.end_time::timestamptz,
      NEW.max_participants,
      true
    ) RETURNING id INTO new_floq_id;
    
    -- Update the plan with the new floq_id
    NEW.floq_id := new_floq_id;
    
    -- Add the creator as a participant in the floq
    INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
    VALUES (new_floq_id, NEW.creator_id, 'creator', NOW())
    ON CONFLICT (floq_id, profile_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-create floqs for group plans
DROP TRIGGER IF EXISTS trigger_ensure_floq_for_group_plan ON floq_plans;
CREATE TRIGGER trigger_ensure_floq_for_group_plan
  BEFORE INSERT ON floq_plans
  FOR EACH ROW
  EXECUTE FUNCTION ensure_floq_for_group_plan();

-- 5. Create a function to sync plan participants with floq participants
CREATE OR REPLACE FUNCTION sync_plan_floq_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- If plan has a floq_id, sync participants
  IF NEW.floq_id IS NOT NULL THEN
    -- Add plan participant to floq participants
    INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
    VALUES (NEW.floq_id, NEW.profile_id, 'member', NOW())
    ON CONFLICT (floq_id, profile_id) DO UPDATE SET
      joined_at = GREATEST(floq_participants.joined_at, NOW());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to sync plan participants with floq participants
DROP TRIGGER IF EXISTS trigger_sync_plan_floq_participants ON plan_participants;
CREATE TRIGGER trigger_sync_plan_floq_participants
  AFTER INSERT ON plan_participants
  FOR EACH ROW
  EXECUTE FUNCTION sync_plan_floq_participants();

-- 7. Create a view for easy floq-plan relationships
CREATE OR REPLACE VIEW floq_plans_with_details AS
SELECT 
  fp.*,
  f.title as floq_title,
  f.primary_vibe as floq_vibe,
  f.participant_count as floq_participant_count,
  f.activity_score as floq_activity_score,
  COUNT(pp.profile_id) as plan_participant_count,
  ARRAY_AGG(
    DISTINCT jsonb_build_object(
      'profile_id', pp.profile_id,
      'rsvp_status', pp.rsvp_status,
      'joined_at', pp.joined_at
    )
  ) FILTER (WHERE pp.profile_id IS NOT NULL) as plan_participants
FROM floq_plans fp
LEFT JOIN floqs f ON fp.floq_id = f.id
LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
GROUP BY fp.id, f.id;

-- 8. Create RPC function to get floq plans with enhanced data
CREATE OR REPLACE FUNCTION get_floq_plans_enhanced(
  p_floq_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  plan_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  planned_at TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  floq_id UUID,
  floq_title TEXT,
  floq_vibe TEXT,
  participant_count INTEGER,
  user_is_participant BOOLEAN,
  user_rsvp_status TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fp.id as plan_id,
    fp.title,
    fp.description,
    fp.status::text,
    fp.planned_at,
    fp.start_time,
    fp.end_time,
    fp.floq_id,
    f.title as floq_title,
    f.primary_vibe::text as floq_vibe,
    COALESCE(COUNT(pp.profile_id), 0)::integer as participant_count,
    EXISTS(
      SELECT 1 FROM plan_participants pp2 
      WHERE pp2.plan_id = fp.id AND pp2.profile_id = p_user_id
    ) as user_is_participant,
    COALESCE(
      (SELECT pp3.rsvp_status FROM plan_participants pp3 
       WHERE pp3.plan_id = fp.id AND pp3.profile_id = p_user_id),
      'not_responded'
    ) as user_rsvp_status,
    fp.created_at
  FROM floq_plans fp
  LEFT JOIN floqs f ON fp.floq_id = f.id
  LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
  WHERE 
    (p_floq_id IS NULL OR fp.floq_id = p_floq_id)
    AND fp.status NOT IN ('archived', 'cancelled')
  GROUP BY fp.id, f.id
  ORDER BY fp.planned_at DESC
  LIMIT p_limit;
END;
$$;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION get_floq_plans_enhanced(UUID, UUID, INTEGER) TO authenticated;
GRANT SELECT ON floq_plans_with_details TO authenticated;

-- 10. Create RPC function to create group plan with floq
CREATE OR REPLACE FUNCTION create_group_plan_with_floq(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_planned_at TIMESTAMPTZ DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL,
  p_vibe_tags TEXT[] DEFAULT ARRAY['social'],
  p_max_participants INTEGER DEFAULT NULL,
  p_location JSONB DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  new_floq_id UUID;
  new_plan_id UUID;
  result JSON;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the floq first
  INSERT INTO floqs (
    title,
    description,
    primary_vibe,
    creator_id,
    profile_id,
    location,
    geo,
    starts_at,
    ends_at,
    max_participants,
    auto_created,
    vibe_tag
  ) VALUES (
    p_title || ' Group',
    COALESCE(p_description, 'Group for plan: ' || p_title),
    COALESCE(p_vibe_tags[1], 'social')::vibe_enum,
    current_user_id,
    current_user_id,
    p_location,
    CASE 
      WHEN p_location IS NOT NULL 
      THEN ST_GeomFromGeoJSON(p_location::text)::geography
      ELSE NULL 
    END,
    p_start_time,
    p_end_time,
    p_max_participants,
    true,
    COALESCE(p_vibe_tags[1], 'social')::vibe_enum
  ) RETURNING id INTO new_floq_id;

  -- Add creator to floq participants
  INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_floq_id, current_user_id, 'creator', NOW());

  -- Create the plan
  INSERT INTO floq_plans (
    title,
    description,
    creator_id,
    profile_id,
    floq_id,
    planned_at,
    start_time,
    end_time,
    vibe_tags,
    max_participants,
    location,
    plan_mode,
    status
  ) VALUES (
    p_title,
    p_description,
    current_user_id,
    current_user_id,
    new_floq_id,
    COALESCE(p_planned_at, p_start_time, NOW() + INTERVAL '1 day'),
    p_start_time,
    p_end_time,
    p_vibe_tags,
    p_max_participants,
    p_location,
    'group',
    'draft'
  ) RETURNING id INTO new_plan_id;

  -- Add creator to plan participants
  INSERT INTO plan_participants (plan_id, profile_id, rsvp_status, joined_at)
  VALUES (new_plan_id, current_user_id, 'yes', NOW());

  result := json_build_object(
    'success', true,
    'floq_id', new_floq_id,
    'plan_id', new_plan_id,
    'message', 'Group plan and floq created successfully'
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_group_plan_with_floq(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, JSONB) TO authenticated;

-- 11. Add helpful comments
COMMENT ON FUNCTION ensure_floq_for_group_plan() IS 'Automatically creates a floq when a group plan is created without one';
COMMENT ON FUNCTION sync_plan_floq_participants() IS 'Keeps floq participants in sync with plan participants';
COMMENT ON VIEW floq_plans_with_details IS 'Enhanced view of floq plans with floq details and participant counts';
COMMENT ON FUNCTION get_floq_plans_enhanced(UUID, UUID, INTEGER) IS 'Get floq plans with enhanced floq and participant data';
COMMENT ON FUNCTION create_group_plan_with_floq(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, JSONB) IS 'Create a group plan with an associated floq in a single transaction';