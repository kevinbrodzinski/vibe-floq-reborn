-- Rally afterglow moments (separate from existing afterglow_moments)
CREATE TABLE IF NOT EXISTS public.rally_afterglow_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  rally_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  center geometry(Point, 4326),
  venue_id uuid,
  interaction_strength real,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (owner-only)
ALTER TABLE public.rally_afterglow_moments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='rally_afterglow_moments' AND policyname='rally_afterglow_own'
  ) THEN
    CREATE POLICY rally_afterglow_own ON public.rally_afterglow_moments
      USING (profile_id = auth.uid());
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_rally_afterglow_moments_profile_time
  ON public.rally_afterglow_moments(profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS ix_rally_afterglow_moments_rally
  ON public.rally_afterglow_moments(rally_id, profile_id);

-- Upsert rally moment for a given profile
CREATE OR REPLACE FUNCTION public.upsert_rally_afterglow_moment(
  _profile_id uuid,
  _rally_id uuid,
  _started_at timestamptz,
  _ended_at timestamptz,
  _center geometry(Point,4326),
  _venue_id uuid,
  _interaction real,
  _participants jsonb,
  _metadata jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  -- Check for existing record
  SELECT id INTO _id FROM public.rally_afterglow_moments
   WHERE profile_id=_profile_id AND rally_id=_rally_id
   LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.rally_afterglow_moments(
      profile_id, rally_id, started_at, ended_at, center, venue_id,
      interaction_strength, participants, metadata
    )
    VALUES(
      _profile_id, _rally_id, _started_at, _ended_at, _center, _venue_id,
      _interaction, COALESCE(_participants,'[]'::jsonb), COALESCE(_metadata,'{}'::jsonb)
    )
    RETURNING id INTO _id;
  ELSE
    UPDATE public.rally_afterglow_moments
       SET ended_at = COALESCE(_ended_at, ended_at),
           center = COALESCE(_center, center),
           venue_id = COALESCE(_venue_id, venue_id),
           interaction_strength = COALESCE(_interaction, interaction_strength),
           participants = CASE WHEN jsonb_array_length(_participants)>0 THEN _participants ELSE participants END,
           metadata = metadata || COALESCE(_metadata,'{}'::jsonb)
     WHERE id=_id;
  END IF;

  RETURN _id;
END$$;

-- Get rally timeline for a day
CREATE OR REPLACE FUNCTION public.get_rally_afterglow_timeline(_day date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id uuid,
  rally_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  interaction_strength real,
  participants jsonb,
  metadata jsonb,
  venue_id uuid,
  center geometry(Point, 4326)
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.rally_id, m.started_at, m.ended_at,
         m.interaction_strength, m.participants, m.metadata, m.venue_id, m.center
  FROM public.rally_afterglow_moments m
  WHERE m.profile_id = auth.uid()
    AND m.started_at >= _day::timestamptz
    AND m.started_at < (_day + 1)::timestamptz
  ORDER BY COALESCE(m.ended_at,m.started_at) DESC;
$$;