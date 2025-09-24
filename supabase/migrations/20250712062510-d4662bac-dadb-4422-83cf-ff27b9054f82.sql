-- ===============================================================
-- Production-grade Floqs RPC Functions & Optimizations
-- ===============================================================

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_floqs_starts_at ON floqs(starts_at);
CREATE INDEX IF NOT EXISTS idx_floq_participants_floq_id ON floq_participants(floq_id);
CREATE INDEX IF NOT EXISTS idx_floq_participants_user_id ON floq_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_floqs_visibility_ends_at ON floqs(visibility, ends_at);

-- Enable RLS on floq_participants table
ALTER TABLE floq_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for floq_participants
CREATE POLICY "fp: self view" ON floq_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "fp: self delete" ON floq_participants
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "fp: public floq participants viewable" ON floq_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM floqs f 
      WHERE f.id = floq_participants.floq_id 
      AND f.visibility = 'public'
    )
  );

-- ===============================================================
-- RPC: get_active_floqs_with_members
-- ===============================================================
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members()
RETURNS TABLE(
  id uuid,
  title text,
  name text,
  primary_vibe vibe_enum,
  vibe_tag vibe_enum,
  type text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  participant_count bigint,
  starts_in_min integer,
  members jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.name,
    f.primary_vibe,
    f.primary_vibe AS vibe_tag,
    COALESCE(f.type, 'auto') AS type,
    f.starts_at,
    f.ends_at,
    COALESCE(c.participant_count, 0) AS participant_count,
    GREATEST(0, EXTRACT(EPOCH FROM (f.starts_at - now()))/60)::int AS starts_in_min,
    COALESCE(m.members, '[]'::jsonb) AS members
  FROM floqs f
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM floq_participants fp
    WHERE fp.floq_id = f.id
  ) c ON TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object(
      'avatar_url', p.avatar_url,
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name
    ) ORDER BY fp.joined_at DESC) AS members
    FROM floq_participants fp
    JOIN profiles p ON p.id = fp.user_id
    WHERE fp.floq_id = f.id
  ) m ON TRUE
  WHERE f.ends_at > now()
    AND f.visibility = 'public'
  ORDER BY f.starts_at;
END;
$$;

-- ===============================================================
-- RPC: join_floq
-- ===============================================================
CREATE OR REPLACE FUNCTION public.join_floq(
  p_floq_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_floq floqs;
  v_participants int;
  v_user_id uuid;
BEGIN
  -- Fix auth.uid() default parameter issue
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Sanity checks
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_floq FROM floqs WHERE id = p_floq_id;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Floq not found'; 
  END IF;
  
  IF v_floq.ends_at <= now() THEN 
    RAISE EXCEPTION 'Floq has expired'; 
  END IF;

  -- Race-safe insert with ON CONFLICT DO NOTHING
  INSERT INTO floq_participants (floq_id, user_id, role)
  VALUES (p_floq_id, v_user_id, 'member')
  ON CONFLICT (floq_id, user_id) DO NOTHING;

  -- Enforce capacity post-insert (race-safe)
  SELECT COUNT(*) INTO v_participants 
  FROM floq_participants 
  WHERE floq_id = p_floq_id;
  
  IF v_floq.max_participants IS NOT NULL AND v_participants > v_floq.max_participants THEN
    DELETE FROM floq_participants 
    WHERE floq_id = p_floq_id AND user_id = v_user_id;
    RAISE EXCEPTION 'Floq is full (capacity: %)', v_floq.max_participants;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'user_id', v_user_id
  );
END;
$$;

-- ===============================================================
-- RPC: leave_floq
-- ===============================================================
CREATE OR REPLACE FUNCTION public.leave_floq(
  p_floq_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_participants int;
  v_user_id uuid;
  v_deleted_count int;
BEGIN
  -- Fix auth.uid() default parameter issue
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Sanity checks
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if floq exists
  IF NOT EXISTS (SELECT 1 FROM floqs WHERE id = p_floq_id) THEN
    RAISE EXCEPTION 'Floq not found';
  END IF;

  -- Remove participant
  DELETE FROM floq_participants 
  WHERE floq_id = p_floq_id AND user_id = v_user_id;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RAISE EXCEPTION 'User was not a participant in this floq';
  END IF;

  -- Get updated participant count
  SELECT COUNT(*) INTO v_participants 
  FROM floq_participants 
  WHERE floq_id = p_floq_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'participant_count', v_participants,
    'floq_id', p_floq_id,
    'user_id', v_user_id
  );
END;
$$;

-- ===============================================================
-- Grant permissions to authenticated users
-- ===============================================================
GRANT EXECUTE ON FUNCTION get_active_floqs_with_members() TO authenticated;
GRANT EXECUTE ON FUNCTION join_floq(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_floq(uuid, uuid) TO authenticated;