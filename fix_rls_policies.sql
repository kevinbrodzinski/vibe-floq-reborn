BEGIN;

/*───────────────────────────────────────────────────────────────
  0.  Ensure helpers exist
────────────────────────────────────────────────────────────────*/

/* 0-a  is_floq_participant */
CREATE OR REPLACE FUNCTION public.is_floq_participant(
  p_floq_id  uuid,
  p_user_id  uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.floq_participants fp
    WHERE  fp.floq_id   = p_floq_id
      AND  fp.profile_id = p_user_id
  );
$$;

/* 0-b  is_floq_public */
CREATE OR REPLACE FUNCTION public.is_floq_public(
  p_floq_id uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT visibility = 'public'
  FROM   public.floqs
  WHERE  id = p_floq_id;
$$;

/* 0-c  can_user_access_floq */
CREATE OR REPLACE FUNCTION public.can_user_access_floq(
  p_floq_id  uuid,
  p_user_id  uuid
) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
        public.is_floq_public(p_floq_id)
     OR (SELECT creator_id = p_user_id FROM public.floqs WHERE id = p_floq_id)
     OR public.is_floq_participant(p_floq_id, p_user_id);
$$;

GRANT EXECUTE ON FUNCTION
  public.is_floq_participant,
  public.is_floq_public,
  public.can_user_access_floq
TO authenticated, anon;

/*───────────────────────────────────────────────────────────────
  1.  FLOQS  — clean out legacy policies, add loop-free read policy
────────────────────────────────────────────────────────────────*/
ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;

/* Drop every old SELECT that might recurse */
DROP POLICY IF EXISTS "Floqs: read nearby public"       ON public.floqs;
DROP POLICY IF EXISTS demo_floqs_public_read            ON public.floqs;
DROP POLICY IF EXISTS demo_floqs_public_read_active     ON public.floqs;
DROP POLICY IF EXISTS floqs_public_read                 ON public.floqs;
DROP POLICY IF EXISTS floqs_creator_manage              ON public.floqs;  -- old ALL

/* Creator INSERT / UPDATE / DELETE policies you added earlier stay. */

/* Re-create canonical read policy */
DROP POLICY IF EXISTS floqs_read ON public.floqs;
CREATE POLICY floqs_read
  ON public.floqs
  FOR SELECT
  USING (
    public.can_user_access_floq(id, auth.uid())
  );

/*───────────────────────────────────────────────────────────────
  2.  FLOQ_PARTICIPANTS — remove legacy policy, keep loop-free one
────────────────────────────────────────────────────────────────*/
ALTER TABLE public.floq_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS floq_participants_select ON public.floq_participants;
/* keep floq_participants_read (helper-based, no recursion) */

COMMIT;