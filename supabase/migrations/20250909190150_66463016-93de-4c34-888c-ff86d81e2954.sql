BEGIN;

-- ─────────────────────────────────────────────────────────────
-- Extensions required
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;         -- gen_random_uuid/gen_random_bytes

-- ─────────────────────────────────────────────────────────────
-- Helper trigger: updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: flows
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.flows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        uuid NOT NULL REFERENCES public.profiles(id),
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  distance_m        double precision DEFAULT 0,
  sun_exposed_min   integer DEFAULT 0,
  vibe_trace        jsonb NOT NULL DEFAULT '[]'::jsonb,        -- decimated [{t,energy,valence}]
  weather_trace     jsonb NOT NULL DEFAULT '[]'::jsonb,        -- decimated [{t,temp,precip,cloud}]
  visibility        text NOT NULL DEFAULT 'owner'
                    CHECK (visibility IN ('owner','friends','public')),

  -- for convergence & listing:
  start_location    geometry(Point,4326),                       -- first segment center (set by app)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_flows_updated
BEFORE UPDATE ON public.flows
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: flow_segments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.flow_segments (
  flow_id           uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  idx               integer NOT NULL,                                        -- 0..N per flow
  arrived_at        timestamptz NOT NULL,
  departed_at       timestamptz,
  venue_id          uuid REFERENCES public.venues(id),                       -- proper FK
  center            geometry(Point,4326) NOT NULL,                           -- coarse ≥100m
  exposure_fraction double precision DEFAULT 0 CHECK (exposure_fraction BETWEEN 0 AND 1),
  vibe_vector       jsonb NOT NULL DEFAULT '{}'::jsonb,                      -- {energy,valence}
  weather_class     text,
  h3_idx            text,                                                    -- optional cell id

  PRIMARY KEY (flow_id, idx)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: flow_media
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.flow_media (
  flow_id     uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  idx         integer NOT NULL,                                 -- segment index
  url         text NOT NULL,                                    -- signed storage URL
  captured_at timestamptz NOT NULL DEFAULT now(),
  media_type  text NOT NULL DEFAULT 'photo',                    -- 'photo'|'video' (extend later)
  PRIMARY KEY (flow_id, idx, url)
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: flow_ripples
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.flow_ripples (
  token        text PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'base64url'),
  flow_id      uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL REFERENCES public.profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,                           -- computed by edge: now() + interval
  hop_limit    integer NOT NULL CHECK (hop_limit BETWEEN 1 AND 3),
  revoked_at   timestamptz,
  access_count integer NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────
-- Indexes (perf)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX flows_start_location_gist   ON public.flows         USING GIST (start_location);
CREATE INDEX flows_profile_started       ON public.flows         (profile_id, started_at DESC);

CREATE INDEX flow_segments_center_gist   ON public.flow_segments USING GIST (center);
CREATE INDEX flow_segments_h3_btree      ON public.flow_segments (h3_idx);
CREATE INDEX flow_segments_venue_time    ON public.flow_segments (venue_id, arrived_at);

CREATE INDEX flow_ripples_expires_active ON public.flow_ripples  (expires_at)
  WHERE revoked_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- Row-Level Security (RLS) enablement
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.flows          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_segments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_media     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_ripples   ENABLE ROW LEVEL SECURITY;

-- NOTE: We assume profiles(id) == auth.uid() (your setup).
-- If different, we can join to profiles on user_id mapping in policies.

-- ─────────────────────────────────────────────────────────────
-- RLS: flows
-- ─────────────────────────────────────────────────────────────
-- Owner full access
CREATE POLICY flows_owner_full ON public.flows
  FOR ALL
  USING      (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Ripple-based read (SELECT)
-- Edge should set: SELECT set_config('app.ripple_token', <token>, true);
CREATE POLICY flows_ripple_read ON public.flows
  FOR SELECT
  USING (
    id IN (
      SELECT fr.flow_id
      FROM public.flow_ripples fr
      WHERE fr.token = current_setting('app.ripple_token', true)
        AND fr.revoked_at IS NULL
        AND fr.expires_at > now()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: flow_segments (inherit from parent flow)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY flow_segments_owner_rw ON public.flow_segments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_segments.flow_id
        AND f.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_segments.flow_id
        AND f.profile_id = auth.uid()
    )
  );

CREATE POLICY flow_segments_ripple_read ON public.flow_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_segments.flow_id
        AND f.id IN (
          SELECT fr.flow_id
          FROM public.flow_ripples fr
          WHERE fr.token = current_setting('app.ripple_token', true)
            AND fr.revoked_at IS NULL
            AND fr.expires_at > now()
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: flow_media (inherit from parent flow)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY flow_media_owner_rw ON public.flow_media
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_media.flow_id
        AND f.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_media.flow_id
        AND f.profile_id = auth.uid()
    )
  );

CREATE POLICY flow_media_ripple_read ON public.flow_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.flows f
      WHERE f.id = flow_media.flow_id
        AND f.id IN (
          SELECT fr.flow_id
          FROM public.flow_ripples fr
          WHERE fr.token = current_setting('app.ripple_token', true)
            AND fr.revoked_at IS NULL
            AND fr.expires_at > now()
        )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: flow_ripples
-- ─────────────────────────────────────────────────────────────
-- Owner manage
CREATE POLICY flow_ripples_owner_manage ON public.flow_ripples
  FOR ALL
  USING      (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Public select by token (edge sets app.ripple_token)
CREATE POLICY flow_ripples_token_select ON public.flow_ripples
  FOR SELECT
  USING (token = current_setting('app.ripple_token', true)
         AND revoked_at IS NULL
         AND expires_at > now());

COMMIT;