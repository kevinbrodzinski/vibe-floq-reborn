-- Afterglow "moments" (rally integration). Safe to run multiple times.
CREATE TABLE IF NOT EXISTS public.afterglow_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('rally')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  center geometry(Point, 4326),
  venue_id uuid REFERENCES public.venues(id),
  interaction_strength real,                 -- 0..1 heuristic
  participants jsonb NOT NULL DEFAULT '[]',  -- [{id,name,avatar}]
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (owner-only)
ALTER TABLE public.afterglow_moments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='afterglow_moments' AND policyname='afterglow_own'
  ) THEN
    CREATE POLICY afterglow_own ON public.afterglow_moments
      USING (profile_id = auth.uid());
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_afterglow_moments_profile_time
  ON public.afterglow_moments(profile_id, started_at DESC);

-- Upsert rally moment for a given profile; used at rally end or on-demand.
CREATE OR REPLACE FUNCTION public.upsert_rally_moment(
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
  -- idempotent key (profile + rally) via metadata->rally_id
  SELECT id INTO _id FROM public.afterglow_moments
   WHERE profile_id=_profile_id AND kind='rally'
     AND (metadata->>'rally_id')::uuid = _rally_id
   LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.afterglow_moments(
      profile_id, kind, started_at, ended_at, center, venue_id,
      interaction_strength, participants, metadata
    )
    VALUES(
      _profile_id, 'rally', _started_at, _ended_at, _center, _venue_id,
      _interaction, COALESCE(_participants,'[]'::jsonb),
      COALESCE(_metadata,'{}'::jsonb) || jsonb_build_object('rally_id',_rally_id::text)
    )
    RETURNING id INTO _id;
  ELSE
    UPDATE public.afterglow_moments
       SET ended_at            = COALESCE(_ended_at, ended_at),
           center              = COALESCE(_center, center),
           venue_id            = COALESCE(_venue_id, venue_id),
           interaction_strength= COALESCE(_interaction, interaction_strength),
           participants        = CASE WHEN jsonb_array_length(_participants)>0 THEN _participants ELSE participants END,
           metadata            = metadata || COALESCE(_metadata,'{}'::jsonb)
     WHERE id=_id;
  END IF;

  RETURN _id;
END$$;

-- Quick timeline for a day; extend later to merge other moment kinds.
CREATE OR REPLACE FUNCTION public.get_afterglow_timeline(_day date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  kind text,
  interaction_strength real,
  participants jsonb,
  metadata jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.started_at, m.ended_at, m.kind,
         m.interaction_strength, m.participants, m.metadata
  FROM public.afterglow_moments m
  WHERE m.profile_id = auth.uid()
    AND m.started_at >= _day::timestamptz
    AND m.started_at < (_day + 1)::timestamptz
  ORDER BY COALESCE(m.ended_at,m.started_at) DESC;
$$;