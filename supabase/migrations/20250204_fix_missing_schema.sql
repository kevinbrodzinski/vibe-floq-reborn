-- Fix missing database schema elements
-- Date: 2025-02-04

-- 1. Update presence_nearby function to use correct parameter name
DROP FUNCTION IF EXISTS public.presence_nearby(DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION public.presence_nearby(
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  radius_m     INTEGER,
  include_self BOOLEAN DEFAULT FALSE
) RETURNS SETOF public.vibes_now
LANGUAGE sql
SECURITY INVOKER
AS $$
SELECT *
FROM public.vibes_now v
WHERE ST_DWithin(
        v.geo,
        ST_MakePoint(lng, lat)::geography,
        radius_m
      )
  AND v.expires_at > NOW()
  AND (include_self OR v.profile_id <> auth.uid())
  AND (
        COALESCE(v.visibility,'public') = 'public'
        OR v.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM friend_requests fr
          WHERE (fr.requester_id = auth.uid() AND fr.addressee_id = v.profile_id)
             OR (fr.addressee_id = auth.uid() AND fr.requester_id = v.profile_id)
        )
      )
$$;

-- 2. Add missing flock_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.flock_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flock_id uuid NOT NULL,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  UNIQUE(flock_id, profile_id)
);

-- 3. Add RLS policies for flock_participants
ALTER TABLE public.flock_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flock participants they're part of" ON public.flock_participants
  FOR SELECT USING (
    profile_id = auth.uid() OR 
    flock_id IN (
      SELECT flock_id FROM flock_participants WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves into flocks" ON public.flock_participants
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Flock owners can manage participants" ON public.flock_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM flock_participants fp 
      WHERE fp.flock_id = flock_participants.flock_id 
        AND fp.profile_id = auth.uid() 
        AND fp.role IN ('owner', 'admin')
    )
  );

-- 4. Add missing columns to presence table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'presence' AND column_name = 'vibe_score') THEN
    ALTER TABLE presence ADD COLUMN vibe_score numeric(5,2) DEFAULT 50.0;
  END IF;
END $$;

-- 5. Grant necessary permissions
GRANT SELECT ON public.flock_participants TO authenticated;
GRANT INSERT ON public.flock_participants TO authenticated;
GRANT UPDATE ON public.flock_participants TO authenticated;
GRANT DELETE ON public.flock_participants TO authenticated;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flock_participants_flock_id ON public.flock_participants(flock_id);
CREATE INDEX IF NOT EXISTS idx_flock_participants_profile_id ON public.flock_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_presence_vibe_score ON public.presence(vibe_score) WHERE vibe_score IS NOT NULL;