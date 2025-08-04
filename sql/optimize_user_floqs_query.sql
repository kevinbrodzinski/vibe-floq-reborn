-- Optimized function to get user's floqs in a single query
-- This replaces the N+1 query pattern in useMyFlocks hook

CREATE OR REPLACE FUNCTION public.get_user_floqs_optimized(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  name text,
  description text,
  primary_vibe vibe_enum,
  creator_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz,
  deleted_at timestamptz,
  role text,
  joined_at timestamptz,
  participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_floqs AS (
    -- Get floqs where user is a participant (including creator)
    SELECT DISTINCT
      f.id,
      f.title,
      f.name,
      f.description,
      f.primary_vibe,
      f.creator_id,
      f.starts_at,
      f.ends_at,
      f.last_activity_at,
      f.created_at,
      f.deleted_at,
      COALESCE(fp.role, 'creator') as role,
      COALESCE(fp.joined_at, f.created_at) as joined_at
    FROM floqs f
    LEFT JOIN floq_participants fp ON f.id = fp.floq_id AND fp.profile_id = p_profile_id
    WHERE 
      -- User is either creator or participant
      (f.creator_id = p_profile_id OR fp.profile_id = p_profile_id)
      -- Exclude deleted floqs
      AND f.deleted_at IS NULL
      -- Exclude expired floqs (optional - uncomment if needed)
      -- AND (f.ends_at IS NULL OR f.ends_at > NOW())
  ),
  floq_counts AS (
    -- Get participant counts for all user's floqs
    SELECT 
      uf.id as floq_id,
      COUNT(fp2.profile_id) as participant_count
    FROM user_floqs uf
    LEFT JOIN floq_participants fp2 ON uf.id = fp2.floq_id
    GROUP BY uf.id
  )
  SELECT 
    uf.id,
    uf.title,
    uf.name,
    uf.description,
    uf.primary_vibe,
    uf.creator_id,
    uf.starts_at,
    uf.ends_at,
    uf.last_activity_at,
    uf.created_at,
    uf.deleted_at,
    uf.role,
    uf.joined_at,
    COALESCE(fc.participant_count, 0) as participant_count
  FROM user_floqs uf
  LEFT JOIN floq_counts fc ON uf.id = fc.floq_id
  ORDER BY 
    uf.last_activity_at DESC NULLS LAST,
    uf.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_floqs_optimized(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_user_floqs_optimized(uuid) IS 'Optimized function to retrieve all floqs for a user (created or participated) with participant counts in a single query';

-- Create index to optimize the query if not exists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floq_participants_profile_floq 
ON floq_participants(profile_id, floq_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_creator_deleted 
ON floqs(creator_id, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_floqs_activity_created 
ON floqs(last_activity_at DESC NULLS LAST, created_at DESC) 
WHERE deleted_at IS NULL;