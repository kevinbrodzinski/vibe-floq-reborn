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
ADD CONSTRAINT IF NOT EXISTS check_floq_plan_consistency 
CHECK (plan_mode != 'group' OR floq_id IS NOT NULL);

-- 3. Create function to automatically create floq when group plan is created without one
CREATE OR REPLACE FUNCTION public.ensure_floq_for_group_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_floq_id UUID;
BEGIN
  -- Only create floq for group plans that don't have one
  IF NEW.plan_mode = 'group' AND NEW.floq_id IS NULL THEN
    -- Create a new floq for this group plan
    INSERT INTO floqs (
      title, 
      description, 
      creator_id, 
      profile_id, 
      primary_vibe, 
      vibe_tag,
      location, 
      geo,
      starts_at, 
      ends_at, 
      max_participants,
      auto_created
    ) VALUES (
      NEW.title || ' Group',
      COALESCE(NEW.description, 'Auto-created group for plan: ' || NEW.title),
      NEW.creator_id,
      NEW.profile_id,
      COALESCE(NEW.vibe_tags[1], 'social')::vibe_enum,
      COALESCE(NEW.vibe_tags[1], 'social')::vibe_enum,
      NEW.location,
      CASE 
        WHEN NEW.location IS NOT NULL 
        THEN ST_GeomFromGeoJSON(NEW.location::text)::geography 
        ELSE NULL 
      END,
      NEW.start_time,
      NEW.end_time,
      NEW.max_participants,
      true  -- Mark as auto-created
    ) RETURNING id INTO new_floq_id;
    
    -- Update the plan with the new floq_id
    NEW.floq_id := new_floq_id;
    
    -- Add the creator as a floq participant
    INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
    VALUES (new_floq_id, NEW.profile_id, 'creator', NOW())
    ON CONFLICT (floq_id, profile_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger to automatically create floqs for group plans
CREATE TRIGGER ensure_floq_for_group_plan_trigger
  BEFORE INSERT ON floq_plans
  FOR EACH ROW
  EXECUTE FUNCTION ensure_floq_for_group_plan();

-- 5. Create function to sync plan participants with floq participants
CREATE OR REPLACE FUNCTION public.sync_plan_floq_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only sync for group plans that have a floq_id
  IF NEW.plan_id IN (
    SELECT id FROM floq_plans 
    WHERE plan_mode = 'group' AND floq_id IS NOT NULL
  ) THEN
    -- Get the floq_id for this plan
    DECLARE
      target_floq_id UUID;
    BEGIN
      SELECT floq_id INTO target_floq_id
      FROM floq_plans 
      WHERE id = NEW.plan_id AND floq_id IS NOT NULL;
      
      IF target_floq_id IS NOT NULL THEN
        -- Add participant to floq if not already there
        INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
        VALUES (
          target_floq_id, 
          NEW.profile_id, 
          CASE WHEN NEW.rsvp_status = 'yes' THEN 'member' ELSE 'invited' END,
          NOW()
        )
        ON CONFLICT (floq_id, profile_id) 
        DO UPDATE SET 
          role = CASE WHEN NEW.rsvp_status = 'yes' THEN 'member' ELSE 'invited' END,
          updated_at = NOW();
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Create trigger to sync plan participants with floq participants
CREATE TRIGGER sync_plan_floq_participants_trigger
  AFTER INSERT ON plan_participants
  FOR EACH ROW
  EXECUTE FUNCTION sync_plan_floq_participants();

-- 7. Create enhanced view for floq-plan relationships
CREATE OR REPLACE VIEW floq_plans_with_details AS
SELECT 
  fp.id as plan_id,
  fp.title,
  fp.description,
  fp.status,
  fp.planned_at,
  fp.start_time,
  fp.end_time,
  fp.creator_id,
  fp.profile_id,
  fp.floq_id,
  f.title as floq_title,
  f.primary_vibe as floq_vibe,
  COUNT(pp.profile_id) as participant_count,
  BOOL_OR(pp.profile_id = auth.uid() AND pp.rsvp_status = 'yes') as user_is_participant,
  COALESCE(
    (SELECT pp2.rsvp_status FROM plan_participants pp2 
     WHERE pp2.plan_id = fp.id AND pp2.profile_id = auth.uid()), 
    'not_invited'
  ) as user_rsvp_status,
  fp.created_at
FROM floq_plans fp
LEFT JOIN floqs f ON fp.floq_id = f.id
LEFT JOIN plan_participants pp ON fp.id = pp.plan_id
GROUP BY 
  fp.id, fp.title, fp.description, fp.status, fp.planned_at, 
  fp.start_time, fp.end_time, fp.creator_id, fp.profile_id, fp.floq_id,
  f.title, f.primary_vibe, fp.created_at;

-- 8. Grant permissions on the view
GRANT SELECT ON floq_plans_with_details TO authenticated;

-- 9. Create RPC function to get enhanced floq plans
CREATE OR REPLACE FUNCTION public.get_floq_plans_enhanced(
  p_floq_id UUID DEFAULT NULL,
  p_profile_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
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
  participant_count BIGINT,
  user_is_participant BOOLEAN,
  user_rsvp_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
BEGIN
  current_profile_id := COALESCE(p_profile_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    fpd.plan_id,
    fpd.title,
    fpd.description,
    fpd.status,
    fpd.planned_at,
    fpd.start_time,
    fpd.end_time,
    fpd.floq_id,
    fpd.floq_title,
    fpd.floq_vibe::TEXT,
    fpd.participant_count,
    fpd.user_is_participant,
    fpd.user_rsvp_status,
    fpd.created_at
  FROM floq_plans_with_details fpd
  WHERE 
    (p_floq_id IS NULL OR fpd.floq_id = p_floq_id)
    AND (
      fpd.profile_id = current_profile_id  -- User's own plans
      OR fpd.user_is_participant = true    -- Plans user is participating in
      OR fpd.floq_id IN (                  -- Plans in floqs user is part of
        SELECT floq_id FROM floq_participants 
        WHERE profile_id = current_profile_id
      )
    )
  ORDER BY fpd.planned_at DESC
  LIMIT p_limit;
END;
$$;

-- 10. Create RPC function to create group plan with floq
CREATE OR REPLACE FUNCTION public.create_group_plan_with_floq(
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
  current_profile_id UUID;
  new_floq_id UUID;
  new_plan_id UUID;
  result JSON;
BEGIN
  current_profile_id := auth.uid();
  IF current_profile_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

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
    current_profile_id,
    current_profile_id,
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

  -- Add creator as floq participant
  INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_floq_id, current_profile_id, 'creator', NOW());

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
    current_profile_id,
    current_profile_id,
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

  -- Add creator as plan participant
  INSERT INTO plan_participants (plan_id, profile_id, rsvp_status, joined_at)
  VALUES (new_plan_id, current_profile_id, 'yes', NOW());

  result := json_build_object(
    'success', true,
    'floq_id', new_floq_id,
    'plan_id', new_plan_id,
    'message', 'Group plan and floq created successfully'
  );

  RETURN result;
END;
$$;

-- 11. Grant permissions on functions
GRANT EXECUTE ON FUNCTION public.get_floq_plans_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_plan_with_floq TO authenticated;

-- 12. Add helpful comments
COMMENT ON FUNCTION public.ensure_floq_for_group_plan() IS 'Automatically creates a floq when a group plan is created without one';
COMMENT ON FUNCTION public.sync_plan_floq_participants() IS 'Keeps floq participants in sync with plan participants for group plans';
COMMENT ON FUNCTION public.get_floq_plans_enhanced(UUID, UUID, INTEGER) IS 'Returns enhanced floq plan data with participant info and user status';
COMMENT ON FUNCTION public.create_group_plan_with_floq(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[], INTEGER, JSONB) IS 'Creates a group plan and its associated floq in a single atomic operation';
COMMENT ON VIEW floq_plans_with_details IS 'Enhanced view of floq plans with participant counts and user participation status';