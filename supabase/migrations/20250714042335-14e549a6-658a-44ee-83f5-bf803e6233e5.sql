-- Migration: Performance and syntax fixes for get_floq_full_details
-- Addresses issues identified in code review

BEGIN;

-- 1. Add partial index for pending invitations (performance optimization)
CREATE INDEX IF NOT EXISTS idx_floq_invitations_pending 
ON public.floq_invitations (floq_id) 
WHERE status = 'pending';

-- 2. Update get_floq_full_details function with fixes
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
BEGIN
  RETURN QUERY
  SELECT 
    f.id, f.title, f.description, f.primary_vibe, f.flock_type,
    f.starts_at, f.ends_at, f.visibility, f.creator_id,
    
    -- Aggregated counts
    (SELECT COUNT(*) FROM public.floq_participants fp WHERE fp.floq_id = f.id)::bigint as participant_count,
    (SELECT COUNT(*) FROM public.floq_boosts fb WHERE fb.floq_id = f.id AND fb.expires_at > now())::bigint as boost_count,
    
    -- Settings with COALESCE defaults and LEFT JOIN
    COALESCE(s.notifications_enabled, true) as notifications_enabled,
    COALESCE(s.mention_permissions, 'all'::mention_permissions_enum) as mention_permissions,
    COALESCE(s.join_approval_required, false) as join_approval_required,
    COALESCE(s.activity_visibility, 'public'::activity_visibility_enum) as activity_visibility,
    s.welcome_message,
    
    -- Participants JSON with DISTINCT ON for deduplication
    COALESCE((
      SELECT jsonb_agg(DISTINCT 
        jsonb_build_object(
          'user_id', fp.user_id,
          'display_name', pr.display_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', fp.role,
          'joined_at', fp.joined_at
        ) ORDER BY jsonb_build_object(
          'user_id', fp.user_id,
          'display_name', pr.display_name,
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', fp.role,
          'joined_at', fp.joined_at
        )
      )
      FROM public.floq_participants fp
      LEFT JOIN public.profiles pr ON pr.id = fp.user_id
      WHERE fp.floq_id = f.id
    ), '[]'::jsonb) as participants,
    
    -- Pending invitations JSON with ORDER BY inside aggregate (syntax fix)
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'invitee_id', fi.invitee_id,
          'invitee_username', pr.username,
          'invitee_display_name', pr.display_name,
          'status', fi.status,
          'sent_at', fi.created_at
        ) ORDER BY fi.created_at  -- ORDER BY inside aggregate
      ) FILTER (WHERE fi.status = 'pending')
      FROM public.floq_invitations fi
      LEFT JOIN public.profiles pr ON pr.id = fi.invitee_id
      WHERE fi.floq_id = f.id
        AND EXISTS (
          SELECT 1
          FROM public.floq_participants fp
          WHERE fp.floq_id = f.id
            AND fp.user_id = auth.uid()
            AND fp.role IN ('creator', 'co-admin')
        )
    ), '[]'::jsonb) as pending_invites
    
  FROM public.floqs f
  LEFT JOIN public.floq_settings s ON s.floq_id = f.id
  WHERE f.id = p_floq_id
    AND (
      f.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.floq_participants fp 
        WHERE fp.floq_id = f.id AND fp.user_id = auth.uid()
      )
      OR f.visibility = 'public'  -- Allow public floq access
    );
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_floq_full_details(uuid) TO authenticated;

COMMIT;