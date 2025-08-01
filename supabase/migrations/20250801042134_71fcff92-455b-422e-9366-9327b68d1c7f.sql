BEGIN;

/* ---------------------------------------------------------------
   Fix security issues: Enable RLS on public tables
---------------------------------------------------------------- */

-- Enable RLS on tables that are missing it
ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_venue_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_stays ENABLE ROW LEVEL SECURITY;

-- Floqs policies
DROP POLICY IF EXISTS floqs_public_read ON public.floqs;
CREATE POLICY floqs_public_read
  ON public.floqs
  FOR SELECT
  USING (visibility = 'public' OR creator_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM floq_participants fp WHERE fp.floq_id = floqs.id AND fp.profile_id = auth.uid()));

DROP POLICY IF EXISTS floqs_creator_manage ON public.floqs;
CREATE POLICY floqs_creator_manage
  ON public.floqs
  FOR ALL
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Profiles policies
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read
  ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS profiles_own_update ON public.profiles;
CREATE POLICY profiles_own_update
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_own_insert ON public.profiles;
CREATE POLICY profiles_own_insert
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Venues policies (public read-only)
DROP POLICY IF EXISTS venues_public_read ON public.venues;
CREATE POLICY venues_public_read
  ON public.venues
  FOR SELECT
  USING (true);

-- User achievements policies
DROP POLICY IF EXISTS user_achievements_own ON public.user_achievements;
CREATE POLICY user_achievements_own
  ON public.user_achievements
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- User venue interactions policies
DROP POLICY IF EXISTS user_venue_interactions_own ON public.user_venue_interactions;
CREATE POLICY user_venue_interactions_own
  ON public.user_venue_interactions
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Venue stays policies
DROP POLICY IF EXISTS venue_stays_own ON public.venue_stays;
CREATE POLICY venue_stays_own
  ON public.venue_stays
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

COMMIT;