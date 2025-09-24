/*****************************************************************
  Phase-2 : "Missing tables & helpers" – optimised final version
  --------------------------------------------------------------
  • user_favorites          – favourites (venue / plan)
  • venues_near_me          – per-user venue-cache
  • get_cluster_venues()    – bbox → venues
  • request_floq_access()   – join / invite helper
******************************************************************/

BEGIN;

------------------------------------------------------------------
-- 🗂 1.  user_favorites  ────────────────────────────────────────
------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id    uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    uuid  NOT NULL,
  item_type  text  NOT NULL CHECK (item_type IN ('venue','plan')),
  created_at timestamptz NOT NULL DEFAULT now(),
  title        text,
  description  text,
  image_url    text,
  PRIMARY KEY (user_id, item_id, item_type)
);

-- minimal read-pattern index (listing all favourites for a user)
CREATE INDEX IF NOT EXISTS idx_fav_user ON public.user_favorites(user_id);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY fav_owner_all
  ON public.user_favorites
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- 📍 2.  venues_near_me  (per-user cache table) ─────────────────
------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venues_near_me (
  user_id      uuid    NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  venue_id     uuid    NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  distance_m   numeric NOT NULL,
  name         text    NOT NULL,
  category     text,
  lat          numeric NOT NULL,
  lng          numeric NOT NULL,
  vibe_score   numeric NOT NULL DEFAULT 0.5,
  last_updated timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, venue_id)
);

-- indices that mirror read-patterns
CREATE INDEX IF NOT EXISTS idx_vnm_user_latlng ON public.venues_near_me(user_id, lat, lng);

ALTER TABLE public.venues_near_me ENABLE ROW LEVEL SECURITY;

CREATE POLICY vnm_owner_select
  ON public.venues_near_me
  FOR SELECT
  USING (auth.uid() = user_id);

------------------------------------------------------------------
-- 🗺 3.  Function: get_cluster_venues(bbox)  ────────────────────
------------------------------------------------------------------
-- helper partial index for the 24 h join
CREATE INDEX IF NOT EXISTS idx_visits_24h
  ON public.venue_visits(venue_id, arrived_at)
  WHERE arrived_at >= now() - interval '24 hours';

-- make sure venues has a spatial index
CREATE INDEX IF NOT EXISTS idx_venue_geom ON public.venues USING GIST (geom);

CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
RETURNS TABLE(
  id         text,
  name       text,
  category   text,
  lat        numeric,
  lng        numeric,
  vibe_score numeric,
  live_count integer,
  check_ins  integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT  v.id::text,
          v.name,
          v.category,
          ST_Y(v.geom)                         AS lat,
          ST_X(v.geom)                         AS lng,
          COALESCE(v.vibe_score, 0.5)          AS vibe_score,
          COALESCE(v.live_count, 0)            AS live_count,
          COUNT(vv.*)::int                     AS check_ins
  FROM    public.venues v
  LEFT JOIN public.venue_visits vv
         ON vv.venue_id = v.id
        AND vv.arrived_at >= now() - interval '24 hours'
  WHERE   v.geom IS NOT NULL
    AND   v.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  GROUP BY v.id, v.name, v.category, v.geom, v.vibe_score, v.live_count
  ORDER BY check_ins DESC, live_count DESC
  LIMIT 100;
$func$;

GRANT EXECUTE ON FUNCTION public.get_cluster_venues TO authenticated;

------------------------------------------------------------------
-- 👥 4.  Function: request_floq_access(uuid)  ───────────────────
------------------------------------------------------------------
-- guarantee invitation uniqueness (safe idempotent approach)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'uniq_invite' 
    AND table_name = 'floq_invitations'
  ) THEN
    ALTER TABLE public.floq_invitations
      ADD CONSTRAINT uniq_invite UNIQUE (floq_id, invitee_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.request_floq_access(floq_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER                       -- executes with function owner's rights
SET search_path = public
AS $func$
DECLARE
  floq_record  public.floqs%ROWTYPE;
BEGIN
  SELECT * INTO floq_record
  FROM   public.floqs
  WHERE  id = floq_id_param
    AND  deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','floq_not_found');
  END IF;

  IF EXISTS (
      SELECT 1 FROM public.floq_participants
       WHERE floq_id = floq_id_param
         AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok',false,'error','already_member');
  END IF;

  IF floq_record.visibility = 'public' THEN
    INSERT INTO public.floq_participants (floq_id,user_id,role)
    VALUES (floq_id_param, auth.uid(),'member')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.floq_activity (floq_id,user_id,kind,content)
    VALUES (floq_id_param, auth.uid(),'user_joined','Joined the floq');

    RETURN jsonb_build_object('ok',true,'status','joined');
  END IF;

  INSERT INTO public.floq_invitations (floq_id,inviter_id,invitee_id,status)
  VALUES (floq_id_param, floq_record.creator_id, auth.uid(),'pending')
  ON CONFLICT DO NOTHING
  RETURNING id INTO STRICT floq_record.id;

  RETURN jsonb_build_object('ok',true,'status','pending','invitation_id',floq_record.id);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.request_floq_access TO authenticated;

COMMIT;