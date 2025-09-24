-- ===============================================
-- Floq Management Backend - Complete Implementation
-- ===============================================

-- 1️⃣ Create enums for stronger type safety
CREATE TYPE public.mention_permissions_enum AS ENUM ('all', 'co-admins', 'host');
CREATE TYPE public.activity_visibility_enum AS ENUM ('public', 'members_only');

-- 2️⃣ Check and truncate existing long descriptions, then add constraint
UPDATE public.floqs 
SET description = LEFT(description, 140) 
WHERE char_length(description) > 140;

ALTER TABLE public.floqs 
ADD CONSTRAINT chk_floqs_description_length 
CHECK (char_length(description) <= 140);

-- 3️⃣ Create floq_settings table with enum types
CREATE TABLE public.floq_settings (
  floq_id           uuid PRIMARY KEY REFERENCES public.floqs(id) ON DELETE CASCADE,
  notifications_enabled   boolean NOT NULL DEFAULT true,
  mention_permissions     mention_permissions_enum NOT NULL DEFAULT 'all',
  join_approval_required  boolean NOT NULL DEFAULT false,
  activity_visibility     activity_visibility_enum NOT NULL DEFAULT 'public',
  welcome_message         text NULL,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_welcome_message_length CHECK (char_length(welcome_message) <= 300)
);

-- 4️⃣ Enable RLS for floq_settings
ALTER TABLE public.floq_settings ENABLE ROW LEVEL SECURITY;

-- Creator-only access for modifications
CREATE POLICY "floq_settings_creator_only"
  ON public.floq_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.floqs f 
      WHERE f.id = floq_settings.floq_id 
        AND f.creator_id = auth.uid()
    )
  );

-- Participants can read settings
CREATE POLICY "floq_settings_participants_can_select"
  ON public.floq_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.floq_participants fp
      WHERE fp.floq_id = floq_settings.floq_id
        AND fp.user_id = auth.uid()
    )
  );

-- 5️⃣ Enhanced RLS for floq_invitations
ALTER TABLE public.floq_invitations ENABLE ROW LEVEL SECURITY;

-- Creators and co-admins can send invitations
CREATE POLICY "floq_invitations_creator_invite"
  ON public.floq_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_invitations.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  );

-- Users can view invitations involving them
CREATE POLICY "floq_invitations_view_own"
  ON public.floq_invitations
  FOR SELECT
  USING (
    inviter_id = auth.uid() OR 
    invitee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_invitations.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  );

-- Invitees can respond to invitations
CREATE POLICY "floq_invitations_respond"
  ON public.floq_invitations
  FOR UPDATE
  USING (invitee_id = auth.uid())
  WITH CHECK (invitee_id = auth.uid());

-- Creators and co-admins can delete invitations
CREATE POLICY "floq_invitations_delete"
  ON public.floq_invitations
  FOR DELETE
  USING (
    inviter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_invitations.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  );

-- 6️⃣ Performance indexes
CREATE INDEX idx_floq_settings_floq_id ON public.floq_settings(floq_id);
CREATE INDEX idx_floq_participants_floq_role ON public.floq_participants(floq_id, role);
CREATE INDEX idx_floq_invitations_status ON public.floq_invitations(floq_id, status);

-- 7️⃣ Helper function: Get complete floq details
CREATE OR REPLACE FUNCTION public.get_floq_full_details(p_floq_id uuid)
RETURNS TABLE(
  -- core floq
  id uuid, title text, description text, primary_vibe vibe_enum, flock_type flock_type_enum,
  starts_at timestamptz, ends_at timestamptz, visibility text, creator_id uuid,
  -- aggregated counts
  participant_count bigint, boost_count bigint,
  -- settings
  notifications_enabled boolean, mention_permissions mention_permissions_enum, 
  join_approval_required boolean, activity_visibility activity_visibility_enum, 
  welcome_message text,
  -- participants JSON
  participants jsonb,
  -- pending invitations
  pending_invites jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if user has permission to view details
  SELECT fp.role INTO user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.user_id = auth.uid();
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION 'Access denied: You are not a participant of this floq';
  END IF;

  RETURN QUERY
  WITH floq_data AS (
    SELECT f.id, f.title, f.description, f.primary_vibe, f.flock_type,
           f.starts_at, f.ends_at, f.visibility, f.creator_id
    FROM public.floqs f
    WHERE f.id = p_floq_id
  ),
  counts AS (
    SELECT 
      (SELECT COUNT(*) FROM public.floq_participants fp WHERE fp.floq_id = p_floq_id) as participant_count,
      (SELECT COUNT(*) FROM public.floq_boosts fb WHERE fb.floq_id = p_floq_id AND fb.expires_at > now()) as boost_count
  ),
  settings_data AS (
    SELECT COALESCE(s.notifications_enabled, true) as notifications_enabled,
           COALESCE(s.mention_permissions, 'all'::mention_permissions_enum) as mention_permissions,
           COALESCE(s.join_approval_required, false) as join_approval_required,
           COALESCE(s.activity_visibility, 'public'::activity_visibility_enum) as activity_visibility,
           s.welcome_message
    FROM public.floq_settings s
    WHERE s.floq_id = p_floq_id
  ),
  participants_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'user_id', fp.user_id,
        'display_name', pr.display_name,
        'username', pr.username,
        'avatar_url', pr.avatar_url,
        'role', fp.role,
        'joined_at', fp.joined_at
      ) ORDER BY fp.joined_at
    ) as participants
    FROM public.floq_participants fp
    LEFT JOIN public.profiles pr ON pr.id = fp.user_id
    WHERE fp.floq_id = p_floq_id
  ),
  invites_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'invitee_id', fi.invitee_id,
        'invitee_username', pr.username,
        'invitee_display_name', pr.display_name,
        'status', fi.status,
        'sent_at', fi.created_at
      )
    ) FILTER (WHERE fi.status = 'pending') as pending_invites
    FROM public.floq_invitations fi
    LEFT JOIN public.profiles pr ON pr.id = fi.invitee_id
    WHERE fi.floq_id = p_floq_id AND user_role IN ('creator', 'co-admin')
  )
  SELECT 
    fd.id, fd.title, fd.description, fd.primary_vibe, fd.flock_type,
    fd.starts_at, fd.ends_at, fd.visibility, fd.creator_id,
    c.participant_count, c.boost_count,
    sd.notifications_enabled, sd.mention_permissions, sd.join_approval_required, 
    sd.activity_visibility, sd.welcome_message,
    COALESCE(pd.participants, '[]'::jsonb) as participants,
    COALESCE(id.pending_invites, '[]'::jsonb) as pending_invites
  FROM floq_data fd
  CROSS JOIN counts c
  CROSS JOIN settings_data sd
  CROSS JOIN participants_data pd
  CROSS JOIN invites_data id;
END;
$$;

-- 8️⃣ Helper function: Set participant role with safety checks
CREATE OR REPLACE FUNCTION public.set_participant_role(
  p_floq_id uuid,
  p_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
  target_user_role text;
  co_admin_count integer;
BEGIN
  -- Validate role
  IF p_new_role NOT IN ('member', 'co-admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be member or co-admin';
  END IF;

  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.user_id = auth.uid();

  -- Check permissions
  IF current_user_role NOT IN ('creator', 'co-admin') THEN
    RAISE EXCEPTION 'Access denied: Only creators and co-admins can change roles';
  END IF;

  -- Get target user's current role
  SELECT role INTO target_user_role
  FROM public.floq_participants fp
  WHERE fp.floq_id = p_floq_id AND fp.user_id = p_user_id;

  IF target_user_role IS NULL THEN
    RAISE EXCEPTION 'User is not a participant of this floq';
  END IF;

  -- Prevent demoting the creator
  IF target_user_role = 'creator' THEN
    RAISE EXCEPTION 'Cannot change the role of the floq creator';
  END IF;

  -- Prevent demoting the last co-admin
  IF p_new_role = 'member' AND target_user_role = 'co-admin' THEN
    SELECT COUNT(*) INTO co_admin_count
    FROM public.floq_participants 
    WHERE floq_id = p_floq_id AND role = 'co-admin';
    
    IF co_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last co-admin. Promote another member first.';
    END IF;
  END IF;

  -- Update the role
  UPDATE public.floq_participants
  SET role = p_new_role
  WHERE floq_id = p_floq_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update participant role';
  END IF;
END;
$$;

-- 9️⃣ Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_floq_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_floq_settings_updated_at
  BEFORE UPDATE ON public.floq_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_floq_settings_updated_at();

-- 🔟 Grant permissions
GRANT EXECUTE ON FUNCTION public.get_floq_full_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_participant_role(uuid, uuid, text) TO authenticated;