-- Add archived field to invitations
ALTER TABLE public.plan_invitations
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Index for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_invites_status_created
  ON public.plan_invitations (status, archived, invited_at DESC);

-- Ensure the user_preferences table has the necessary column
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS declined_plan_types JSONB DEFAULT '{}'::jsonb;

-- RPC: Log an invite decline and update preferences
CREATE OR REPLACE FUNCTION public.log_invite_decline(
  p_user_id UUID,
  p_plan_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_type TEXT;
  existing_count INT;
BEGIN
  -- Get the plan type
  SELECT COALESCE(vibe_tags->>0, 'general')
  INTO plan_type
  FROM public.floq_plans
  WHERE id = p_plan_id;

  -- Upsert preference record if plan_type is found
  IF plan_type IS NOT NULL THEN
    UPDATE public.user_preferences
    SET declined_plan_types = 
      jsonb_set(
        declined_plan_types,
        ARRAY[plan_type],
        to_jsonb(
          COALESCE(
            (declined_plan_types ->> plan_type)::int,
            0
          ) + 1
        ),
        true
      ),
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Grant secure access to authenticated users
GRANT EXECUTE ON FUNCTION public.log_invite_decline(uuid, uuid) TO authenticated;