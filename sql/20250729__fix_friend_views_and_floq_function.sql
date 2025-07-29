-- Fix friend views and get_visible_floqs_with_members function
-- Applied manually - 2025-07-29

-- First drop the existing views
DROP VIEW IF EXISTS public.v_friend_last_seen;

-- Then recreate with your new definition
CREATE VIEW public.v_friend_last_seen WITH (security_invoker=on) AS
SELECT
  f.friend_id,
  MAX(v.ts) AS last_seen_at
FROM public.friendships f
JOIN public.vibes_log v
  ON v.profile_id = f.friend_id
WHERE f.profile_id = auth.uid()
GROUP BY f.friend_id;

GRANT SELECT ON public.v_friend_last_seen TO authenticated;

-- First drop the existing view
DROP VIEW IF EXISTS public.v_friend_requests;

-- Then recreate with your new definition
CREATE VIEW public.v_friend_requests WITH (security_invoker=on) AS
SELECT
  fr.id,
  fr.profile_id      AS requester_id,
  fr.friend_id       AS me,
  fr.created_at
FROM public.friend_requests fr
WHERE fr.friend_id = auth.uid()
  AND fr.status     = 'pending';

GRANT SELECT ON public.v_friend_requests TO authenticated;

/* ────────────────────────────────────────────────────────────────────────────
   Replace every previous overload
──────────────────────────────────────────────────────────────────────────── */
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'get_visible_floqs_with_members'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.get_visible_floqs_with_members(%s);',
      r.args
    );
  END LOOP;
END$$;

/* ────────────────────────────────────────────────────────────────────────────
   New definition
──────────────────────────────────────────────────────────────────────────── */
CREATE FUNCTION public.get_visible_floqs_with_members (
  p_lat       DOUBLE PRECISION,
  p_lng       DOUBLE PRECISION,
  p_limit     INT  DEFAULT 20,
  p_offset    INT  DEFAULT 0,
  p_radius_km INT  DEFAULT 5          -- ❶ optional hard-cut radius
)
RETURNS TABLE (
  id               UUID,
  title            TEXT,
  description      TEXT,
  primary_vibe     TEXT,
  vibe_tag         TEXT,
  flock_type       TEXT,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  starts_in_min    INT,
  distance_m       INT,
  participant_count INT,
  boost_count      INT,
  members          JSONB,
  creator_id       UUID
)
LANGUAGE sql
SECURITY INVOKER
AS $func$
/* ❂ STEP 1: base set – only floqs user is allowed to see, still active,
       and inside the radius. */
WITH base AS (
  SELECT f.*,
         ST_Distance(
           f.location::geography,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
         )::INT                               AS distance_m,
         GREATEST(
           0,
           CEIL(EXTRACT(EPOCH FROM (f.starts_at - NOW())) / 60)
         )::INT                               AS starts_in_min
  FROM   public.floqs f
  WHERE  (
            f.visibility = 'public'
         OR f.creator_id = auth.uid()
         OR EXISTS ( SELECT 1 FROM public.floq_participants fp
                     WHERE fp.floq_id = f.id
                       AND fp.profile_id = auth.uid() )
         )
    AND  (f.ends_at IS NULL OR f.ends_at > NOW())
    AND  ST_DWithin(
           f.location::geography,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
           p_radius_km * 1000
         )
),
/* ❂ STEP 2: participant aggregation */
members_cte AS (
  SELECT fp.floq_id,
         COUNT(*)::INT                                            AS participant_count,
         jsonb_agg(
           jsonb_build_object(
             'profile_id', pr.id,
             'display_name', pr.display_name,
             'avatar_url',   pr.avatar_url
           ) ORDER BY pr.display_name
         )                                                       AS members
  FROM   public.floq_participants fp
  JOIN   public.profiles pr ON pr.id = fp.profile_id
  GROUP  BY fp.floq_id
),
/* ❂ STEP 3: boost aggregation */
boost_cte AS (
  SELECT floq_id,
         COUNT(*)::INT AS boost_count
  FROM   public.floq_boosts
  GROUP  BY floq_id
)
SELECT
  b.id,
  b.title,
  b.description,
  b.primary_vibe,
  b.vibe_tag,
  b.flock_type,
  b.starts_at,
  b.ends_at,
  b.starts_in_min,
  b.distance_m,
  COALESCE(m.participant_count, 0) AS participant_count,
  COALESCE(bt.boost_count, 0)     AS boost_count,
  COALESCE(m.members, '[]'::jsonb) AS members,
  b.creator_id
FROM   base        b
LEFT   JOIN members_cte m ON m.floq_id = b.id
LEFT   JOIN boost_cte   bt ON bt.floq_id = b.id
ORDER  BY b.starts_at ASC
LIMIT  p_limit
OFFSET p_offset;
$func$;

/* ────────────────────────────────────────────────────────────────────────────
   Grant
──────────────────────────────────────────────────────────────────────────── */
GRANT EXECUTE ON FUNCTION public.get_visible_floqs_with_members
  TO anon, authenticated;