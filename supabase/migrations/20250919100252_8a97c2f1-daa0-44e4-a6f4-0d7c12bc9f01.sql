-- Add rally scoping and rename AI features to "wings"
BEGIN;

-- 1. Create rally scope enum if not exists
DO $$ BEGIN
  CREATE TYPE public.rally_scope AS ENUM ('field', 'floq');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add scope columns to rallies table
ALTER TABLE public.rallies
  ADD COLUMN IF NOT EXISTS scope public.rally_scope NOT NULL DEFAULT 'field',
  ADD COLUMN IF NOT EXISTS floq_id uuid NULL REFERENCES public.floqs(id) ON DELETE CASCADE;

-- 3. Create index for efficient rally queries
CREATE INDEX IF NOT EXISTS idx_rallies_scope_status_exp
  ON public.rallies(scope, floq_id, status, expires_at DESC);

-- 4. Helper functions for RLS policies

-- Check if viewer is friends with another profile
CREATE OR REPLACE FUNCTION public.viewer_is_friend(other_profile_id uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.friend_state = 'accepted'
      AND ((f.profile_low = auth.uid() AND f.profile_high = other_profile_id)
        OR (f.profile_low = other_profile_id AND f.profile_high = auth.uid()))
  );
$$;

-- Get viewer's last known location point
CREATE OR REPLACE FUNCTION public.viewer_point()
RETURNS geography 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ST_MakePoint(p.lng, p.lat)::geography
  FROM public.presence p
  WHERE p.profile_id = auth.uid()
  ORDER BY p.updated_at DESC
  LIMIT 1;
$$;

-- Check if viewer is in a floq
CREATE OR REPLACE FUNCTION public.viewer_in_floq(fid uuid)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_participants p 
    WHERE p.floq_id = fid AND p.profile_id = auth.uid()
  );
$$;

-- 5. Rename AI tables to wings
ALTER TABLE public.floq_stream_events RENAME TO floq_wings_events;
ALTER TABLE public.floq_poll_votes RENAME TO floq_wings_votes;

-- Update wings events table structure if needed
ALTER TABLE public.floq_wings_events
  ALTER COLUMN kind TYPE text,
  ADD CONSTRAINT wings_event_kind_check 
    CHECK (kind IN ('poll','venue_suggestion','time_picker','meet_halfway','reminder','recap'));

-- 6. Set up RLS for rallies table
ALTER TABLE public.rallies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS rl_rallies_read ON public.rallies;
DROP POLICY IF EXISTS rl_rallies_insert ON public.rallies;
DROP POLICY IF EXISTS rl_rallies_update ON public.rallies;

-- READ policy: creator + friends (field) + floq members (floq scope)
CREATE POLICY rl_rallies_read ON public.rallies
FOR SELECT USING (
  -- Creator can always see their rallies
  creator_id = auth.uid()
  OR
  -- Field rallies: only friends of creator AND within proximity
  (
    scope = 'field'
    AND public.viewer_is_friend(creator_id)
    AND public.viewer_point() IS NOT NULL
    AND ST_DWithin(
      center::geography,
      public.viewer_point(),
      COALESCE(current_setting('app.field_radius_m', true)::int, 4000)
    )
  )
  OR
  -- Floq rallies: floq members only
  (
    scope = 'floq' 
    AND floq_id IS NOT NULL 
    AND public.viewer_in_floq(floq_id)
  )
);

-- INSERT policy: authenticated users can create rallies they have access to
CREATE POLICY rl_rallies_insert ON public.rallies
FOR INSERT WITH CHECK (
  creator_id = auth.uid()
  AND (
    scope = 'field' 
    OR (scope = 'floq' AND floq_id IS NOT NULL AND public.viewer_in_floq(floq_id))
  )
);

-- UPDATE policy: only creators can update their rallies
CREATE POLICY rl_rallies_update ON public.rallies
FOR UPDATE 
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- 7. Set up RLS for rally invites (allow updates by invitee)
ALTER TABLE public.rally_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rl_invite_read ON public.rally_invites;
DROP POLICY IF EXISTS rl_invite_update ON public.rally_invites;

CREATE POLICY rl_invite_read ON public.rally_invites
FOR SELECT USING (
  to_profile = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.rallies r 
    WHERE r.id = rally_invites.rally_id AND r.creator_id = auth.uid()
  )
);

CREATE POLICY rl_invite_update ON public.rally_invites
FOR UPDATE 
USING (to_profile = auth.uid())
WITH CHECK (to_profile = auth.uid());

-- 8. Set up RLS for wings tables
ALTER TABLE public.floq_wings_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floq_wings_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS wings_read ON public.floq_wings_events;
DROP POLICY IF EXISTS wings_insert ON public.floq_wings_events;
DROP POLICY IF EXISTS wings_vote ON public.floq_wings_votes;

-- Wings events: floq members can read
CREATE POLICY wings_read ON public.floq_wings_events 
FOR SELECT USING (public.viewer_in_floq(floq_id));

-- Wings events: service role can insert (for AI functions)
CREATE POLICY wings_insert ON public.floq_wings_events 
FOR INSERT WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR created_by = auth.uid()
);

-- Wings votes: floq members can vote
CREATE POLICY wings_vote ON public.floq_wings_votes 
FOR INSERT WITH CHECK (
  profile_id = auth.uid()
  AND public.viewer_in_floq((SELECT floq_id FROM floq_wings_events WHERE id = event_id))
);

-- Wings events: users can dismiss their own or service role can update
CREATE POLICY wings_update ON public.floq_wings_events
FOR UPDATE USING (
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR (created_by = auth.uid() AND status IN ('dismissed', 'expired'))
  OR public.viewer_in_floq(floq_id)
)
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR (created_by = auth.uid() AND status IN ('dismissed', 'expired'))
  OR public.viewer_in_floq(floq_id)
);

-- 9. Set default field radius setting
DO $$
BEGIN
  PERFORM set_config('app.field_radius_m', '4000', false);
EXCEPTION WHEN OTHERS THEN
  -- Ignore if setting already exists
  NULL;
END $$;

COMMIT;