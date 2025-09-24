-- Improve Floq-Plan Integration Database Schema
-- Migration: Enhanced integration between floqs and plans with automatic synchronization
-- Dependencies: Requires public.profiles, public.floqs, public.floq_participants, public.floq_plans, and public.plan_participants tables to exist

-- 1. Add missing indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_floq_plans_floq_id_status ON public.floq_plans(floq_id, status);
CREATE INDEX IF NOT EXISTS idx_floq_plans_creator_floq ON public.floq_plans(profile_id, floq_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id ON public.plan_participants(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_profile_id ON public.plan_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_floq_participants_floq_profile ON public.floq_participants(floq_id, profile_id);

-- 2. Add constraint to ensure plan-floq consistency
ALTER TABLE public.floq_plans 
ADD CONSTRAINT IF NOT EXISTS check_floq_plan_consistency 
CHECK (floq_id IS NOT NULL);

-- 3. Function to automatically create floq for group plans
CREATE OR REPLACE FUNCTION public.ensure_floq_for_group_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_floq_id UUID;
  plan_creator_id UUID;
BEGIN
  -- Only process group plans that don't have a floq yet
  IF NEW.type = 'group' AND NEW.floq_id IS NULL THEN
    plan_creator_id := NEW.profile_id;
    
    -- Create a new floq for this group plan
    INSERT INTO public.floqs (
      name,
      description,
      vibe,
      creator_id,
      profile_id,
      location,
      location_radius,
      is_private,
      max_participants,
      created_at,
      updated_at
    )
    VALUES (
      COALESCE(NEW.title, 'Group for plan'),
      COALESCE(NEW.description, 'Group for plan: ' || NEW.title),
      COALESCE(NEW.vibe_tags[1], 'social')::vibe_enum,
      plan_creator_id,
      plan_creator_id,
      NEW.location,
      CASE 
        WHEN NEW.location IS NOT NULL 
        THEN COALESCE(NEW.location_radius, 100)
        ELSE NULL 
      END,
      FALSE, -- Group plans are not private by default
      20, -- Default max participants
      NOW(),
      NOW()
    )
    RETURNING id INTO new_floq_id;
    
    -- Update the plan with the new floq_id
    UPDATE public.floq_plans 
    SET floq_id = new_floq_id, updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Add the plan creator as a floq participant
    INSERT INTO floq_participants (floq_id, profile_id, role, joined_at)
    VALUES (new_floq_id, plan_creator_id, 'creator', NOW())
    ON CONFLICT (floq_id, profile_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger for automatic floq creation
DROP TRIGGER IF EXISTS trigger_ensure_floq_for_group_plan ON public.floq_plans;
CREATE TRIGGER trigger_ensure_floq_for_group_plan
  AFTER INSERT ON public.floq_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_floq_for_group_plan();

-- 5. Function to sync plan participants with floq participants
CREATE OR REPLACE FUNCTION public.sync_plan_floq_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_floq_id UUID;
BEGIN
  -- Get the floq_id for this plan
  SELECT fp.floq_id INTO plan_floq_id
  FROM public.floq_plans fp
  WHERE fp.id = COALESCE(NEW.plan_id, OLD.plan_id);
  
  -- Only proceed if the plan has an associated floq
  IF plan_floq_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      -- Add participant to floq when they join a plan
      INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
      VALUES (plan_floq_id, NEW.profile_id, 'member', NOW())
      ON CONFLICT (floq_id, profile_id) DO NOTHING;
      
    ELSIF TG_OP = 'DELETE' THEN
      -- Remove participant from floq when they leave a plan
      DELETE FROM public.floq_participants
      WHERE floq_id = plan_floq_id AND profile_id = OLD.profile_id;
      
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Create triggers for participant synchronization
DROP TRIGGER IF EXISTS trigger_sync_plan_participants_insert ON public.plan_participants;
CREATE TRIGGER trigger_sync_plan_participants_insert
  AFTER INSERT ON public.plan_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_plan_floq_participants();

DROP TRIGGER IF EXISTS trigger_sync_plan_participants_delete ON public.plan_participants;
CREATE TRIGGER trigger_sync_plan_participants_delete
  AFTER DELETE ON public.plan_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_plan_floq_participants();

-- 7. Create enhanced view for floq plans with detailed information
CREATE OR REPLACE VIEW public.floq_plans_with_details AS
SELECT 
  fp.*,
  f.name as floq_name,
  f.description as floq_description,
  f.vibe as floq_vibe,
  f.location as floq_location,
  f.is_private as floq_is_private,
  f.max_participants as floq_max_participants,
  creator_profile.display_name as creator_name,
  creator_profile.avatar_url as creator_avatar,
  (
    SELECT COUNT(*)
    FROM public.plan_participants pp
    WHERE pp.plan_id = fp.id
  ) as participant_count,
  (
    SELECT COUNT(*)
    FROM public.plan_stops ps
    WHERE ps.plan_id = fp.id
  ) as stop_count,
  (
    SELECT json_agg(
      json_build_object(
        'profile_id', pp.profile_id,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'joined_at', pp.joined_at
      )
    )
    FROM public.plan_participants pp
    JOIN public.profiles p ON pp.profile_id = p.id
    WHERE pp.plan_id = fp.id
  ) as participants,
  (
    SELECT json_agg(
      json_build_object(
        'id', ps.id,
        'venue_id', ps.venue_id,
        'order_index', ps.order_index,
        'estimated_duration_minutes', ps.estimated_duration_minutes,
        'notes', ps.notes
      ) ORDER BY ps.order_index
    )
    FROM public.plan_stops ps
    WHERE ps.plan_id = fp.id
  ) as stops
FROM public.floq_plans fp
LEFT JOIN public.floqs f ON fp.floq_id = f.id
LEFT JOIN public.profiles creator_profile ON fp.profile_id = creator_profile.id;

-- 8. Enhanced RPC function to get floq plans with filtering and pagination
CREATE OR REPLACE FUNCTION public.get_floq_plans_enhanced(
  p_floq_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  floq_id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  type TEXT,
  scheduled_for TIMESTAMPTZ,
  location JSONB,
  location_radius INTEGER,
  vibe_tags TEXT[],
  profile_id UUID,
  creator_name TEXT,
  creator_avatar TEXT,
  floq_name TEXT,
  floq_vibe TEXT,
  participant_count BIGINT,
  stop_count BIGINT,
  participants JSONB,
  stops JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fpd.id,
    fpd.floq_id,
    fpd.title,
    fpd.description,
    fpd.status,
    fpd.type,
    fpd.scheduled_for,
    fpd.location,
    fpd.location_radius,
    fpd.vibe_tags,
    fpd.profile_id,
    fpd.creator_name,
    fpd.creator_avatar,
    fpd.floq_name,
    fpd.floq_vibe::TEXT,
    fpd.participant_count,
    fpd.stop_count,
    fpd.participants,
    fpd.stops,
    fpd.created_at,
    fpd.updated_at
  FROM public.floq_plans_with_details fpd
  WHERE (p_floq_id IS NULL OR fpd.floq_id = p_floq_id)
    AND (p_status IS NULL OR fpd.status = p_status)
    AND (
      -- User can see plans they created
      fpd.profile_id = auth.uid()
      OR
      -- User can see plans for floqs they participate in
      EXISTS (
        SELECT 1 FROM public.floq_participants fp2
        WHERE fp2.floq_id = fpd.floq_id 
        AND fp2.profile_id = auth.uid()
      )
      OR
      -- User can see plans they participate in directly
      EXISTS (
        SELECT 1 FROM public.plan_participants pp2
        WHERE pp2.plan_id = fpd.id 
        AND pp2.profile_id = auth.uid()
      )
    )
  ORDER BY fpd.scheduled_for ASC, fpd.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 9. RPC function to create a group plan with automatic floq creation
CREATE OR REPLACE FUNCTION public.create_group_plan_with_floq(
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL,
  p_location JSONB DEFAULT NULL,
  p_location_radius INTEGER DEFAULT 100,
  p_vibe_tags TEXT[] DEFAULT ARRAY['social'],
  p_floq_name TEXT DEFAULT NULL,
  p_floq_description TEXT DEFAULT NULL
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
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Create floq first
  INSERT INTO public.floqs (
    name,
    description,
    vibe,
    creator_id,
    profile_id,
    location,
    location_radius,
    is_private,
    max_participants,
    created_at,
    updated_at
  )
  VALUES (
    COALESCE(p_floq_name, p_title),
    COALESCE(p_floq_description, 'Group for plan: ' || p_title),
    COALESCE(p_vibe_tags[1], 'social')::vibe_enum,
    current_profile_id,
    current_profile_id,
    p_location,
    CASE 
      WHEN p_location IS NOT NULL 
      THEN COALESCE(p_location_radius, 100)
      ELSE NULL 
    END,
    FALSE,
    20,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_floq_id;
  
  -- Add creator as floq participant
  INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
  VALUES (new_floq_id, current_profile_id, 'creator', NOW());
  
  -- Create plan
  INSERT INTO public.floq_plans (
    floq_id,
    title,
    description,
    status,
    type,
    scheduled_for,
    location,
    location_radius,
    vibe_tags,
    profile_id,
    created_at,
    updated_at
  )
  VALUES (
    new_floq_id,
    p_title,
    p_description,
    'draft',
    'group',
    p_scheduled_for,
    p_location,
    p_location_radius,
    p_vibe_tags,
    current_profile_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_plan_id;
  
  -- Add creator as plan participant
  INSERT INTO public.plan_participants (plan_id, profile_id, joined_at)
  VALUES (new_plan_id, current_profile_id, NOW());
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'floq_id', new_floq_id,
    'plan_id', new_plan_id,
    'message', 'Group plan and floq created successfully'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- 10. Function to join a plan (and automatically join associated floq)
CREATE OR REPLACE FUNCTION public.join_plan_with_floq(
  p_plan_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  plan_floq_id UUID;
  result JSON;
BEGIN
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get the floq_id for this plan
  SELECT floq_id INTO plan_floq_id
  FROM public.floq_plans
  WHERE id = p_plan_id;
  
  -- Check if plan exists
  IF plan_floq_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Plan not found'
    );
  END IF;
  
  -- Add to plan participants
  INSERT INTO public.plan_participants (plan_id, profile_id, joined_at)
  VALUES (p_plan_id, current_profile_id, NOW())
  ON CONFLICT (plan_id, profile_id) DO NOTHING;
  
  -- Add to floq participants (if floq exists)
  IF plan_floq_id IS NOT NULL THEN
    INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
    VALUES (plan_floq_id, current_profile_id, 'member', NOW())
    ON CONFLICT (floq_id, profile_id) DO NOTHING;
  END IF;
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Successfully joined plan and floq'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- 11. Function to leave a plan (and optionally leave associated floq)
CREATE OR REPLACE FUNCTION public.leave_plan_with_floq(
  p_plan_id UUID,
  p_leave_floq BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_profile_id UUID;
  plan_floq_id UUID;
  result JSON;
BEGIN
  -- Get current user profile ID
  current_profile_id := auth.uid();
  
  -- Validate authentication
  IF current_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get the floq_id for this plan
  SELECT floq_id INTO plan_floq_id
  FROM public.floq_plans
  WHERE id = p_plan_id;
  
  -- Remove from plan participants
  DELETE FROM public.plan_participants
  WHERE plan_id = p_plan_id AND profile_id = current_profile_id;
  
  -- Remove from floq participants if requested and floq exists
  IF p_leave_floq AND plan_floq_id IS NOT NULL THEN
    DELETE FROM public.floq_participants
    WHERE floq_id = plan_floq_id AND profile_id = current_profile_id;
  END IF;
  
  -- Build success result
  result := json_build_object(
    'success', true,
    'message', 'Successfully left plan' || 
      CASE WHEN p_leave_floq THEN ' and floq' ELSE '' END
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Database error occurred',
      'details', SQLERRM
    );
END;
$$;

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON public.floq_plans_with_details TO authenticated;