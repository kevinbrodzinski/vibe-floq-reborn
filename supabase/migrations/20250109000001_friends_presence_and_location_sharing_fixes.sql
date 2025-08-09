-- ====================================================================
-- FRIENDS PRESENCE AND LOCATION SHARING FIXES
-- Migration: 20250109000001
-- Description: Consolidates friends presence view, location sharing functions,
--              presence mirroring, and venue bbox function cleanup
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. FRIENDS WITH PRESENCE VIEW
-- ====================================================================
-- Replaces the existing view with proper presence integration
-- Uses auth.uid() for row-level security (Postgres 13 compatible)

CREATE OR REPLACE VIEW public.v_friends_with_presence AS
(
  -- Accepted friendships → show presence
  SELECT
    CASE WHEN fv.profile_low = auth.uid() THEN fv.profile_high ELSE fv.profile_low END AS friend_id,
    p.display_name,
    p.username,
    p.avatar_url,
    pr.started_at,
    pr.vibe_tag::text AS vibe_tag,
    (pr.profile_id IS NOT NULL) AS online,
    'accepted'::text AS friend_state,
    fv.created_at,
    fv.responded_at,
    false AS is_outgoing_request,
    false AS is_incoming_request
  FROM public.friendships_v fv
  JOIN public.profiles p 
    ON p.id = (CASE WHEN fv.profile_low = auth.uid() THEN fv.profile_high ELSE fv.profile_low END)
  LEFT JOIN public.presence pr 
    ON pr.profile_id = p.id
  WHERE (fv.profile_low = auth.uid() OR fv.profile_high = auth.uid())
    AND fv.friend_state = 'accepted'::friend_state
)
UNION ALL
(
  -- Outgoing pending requests
  SELECT
    fr.other_profile_id AS friend_id,
    p.display_name,
    p.username,
    p.avatar_url,
    pr.started_at,
    pr.vibe_tag::text AS vibe_tag,
    (pr.profile_id IS NOT NULL) AS online,
    fr.status AS friend_state,
    fr.created_at,
    fr.responded_at,
    true AS is_outgoing_request,
    false AS is_incoming_request
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.id = fr.other_profile_id
  LEFT JOIN public.presence pr ON pr.profile_id = p.id
  WHERE fr.profile_id = auth.uid()
    AND fr.status = 'pending'::text
)
UNION ALL
(
  -- Incoming pending requests
  SELECT
    fr.profile_id AS friend_id,
    p.display_name,
    p.username,
    p.avatar_url,
    pr.started_at,
    pr.vibe_tag::text AS vibe_tag,
    (pr.profile_id IS NOT NULL) AS online,
    fr.status AS friend_state,
    fr.created_at,
    fr.responded_at,
    false AS is_outgoing_request,
    true AS is_incoming_request
  FROM public.friend_requests fr
  JOIN public.profiles p ON p.id = fr.profile_id
  LEFT JOIN public.presence pr ON pr.profile_id = p.id
  WHERE fr.other_profile_id = auth.uid()
    AND fr.status = 'pending'::text
);

COMMENT ON VIEW public.v_friends_with_presence IS 
  'Friends and requests with live presence (vibe_tag), built for Postgres 13 compatibility';

-- ====================================================================
-- 2. LOCATION SHARING FUNCTIONS
-- ====================================================================

-- Function to set live sharing preferences between friends
CREATE OR REPLACE FUNCTION public.set_live_share(_friend uuid, _on boolean DEFAULT true)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $function$
  INSERT INTO public.friend_share_pref (profile_id, other_profile_id, is_live, updated_at)
  VALUES (auth.uid(), _friend, _on, now())
  ON CONFLICT (profile_id, other_profile_id)
  DO UPDATE SET
    is_live    = EXCLUDED.is_live,
    updated_at = now();
$function$;

-- Function to get visible friend presence based on sharing preferences
CREATE OR REPLACE FUNCTION public.get_visible_friend_presence(p_viewer uuid)
RETURNS TABLE(
  profile_id uuid, 
  lat double precision, 
  lng double precision, 
  vibe text, 
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH friends AS (
  SELECT CASE WHEN f.user_low = p_viewer THEN f.user_high ELSE f.user_low END AS friend_id
  FROM public.friendships f
  WHERE p_viewer IN (f.user_low, f.user_high) AND f.friend_state = 'accepted'
),
overrides AS (
  SELECT profile_id, other_profile_id, is_live,
         (ends_at IS NULL OR ends_at > now()) AS within_window
  FROM public.friend_share_pref
)
SELECT
  vn.profile_id,
  ST_Y(vn.location::geometry) AS lat,
  ST_X(vn.location::geometry) AS lng,
  vn.vibe::text               AS vibe,
  vn.updated_at
FROM public.vibes_now vn
JOIN friends fr ON fr.friend_id = vn.profile_id
LEFT JOIN overrides ov ON ov.profile_id = vn.profile_id AND ov.other_profile_id = p_viewer
JOIN profiles pr ON pr.id = vn.profile_id
WHERE vn.updated_at > now() - interval '5 minutes'
  AND (
    vn.visibility = 'public'
    OR (ov.is_live AND ov.within_window)
    OR pr.live_scope IN ('friends','mutuals')
  );
$$;

-- Text wrapper for presence upsert (handles H3 index as text)
CREATE OR REPLACE FUNCTION public.upsert_presence_realtime_v2_text(
  p_lat double precision,
  p_lng double precision,
  p_vibe text DEFAULT 'social',
  p_accuracy double precision DEFAULT 10.0,
  p_h3_idx_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_h3_idx bigint := NULLIF(p_h3_idx_text,'')::numeric::bigint;
BEGIN
  RETURN public.upsert_presence_realtime_v2(p_lat, p_lng, p_vibe, p_accuracy, v_h3_idx);
END
$$;

-- ====================================================================
-- 3. PRESENCE MIRRORING SYSTEM
-- ====================================================================

-- Function to mirror presence data to vibes_now table
CREATE OR REPLACE FUNCTION public.mirror_presence_to_vibes_now()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_visibility public.vibe_visibility := COALESCE(
    (SELECT live_scope FROM profiles WHERE id = NEW.profile_id), 
    'friends'::public.vibe_visibility
  );
  v_expires_at timestamptz := now() + interval '10 minutes';
BEGIN
  INSERT INTO public.vibes_now (
    profile_id, location, vibe, visibility, updated_at, expires_at, venue_id, h3_idx
  )
  VALUES (
    NEW.profile_id, NEW.location, NEW.vibe::text, v_visibility, 
    NEW.updated_at, v_expires_at, NEW.venue_id, NEW.h3_idx
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    location    = EXCLUDED.location,
    vibe        = EXCLUDED.vibe,
    visibility  = EXCLUDED.visibility,
    updated_at  = EXCLUDED.updated_at,
    expires_at  = EXCLUDED.expires_at,
    venue_id    = EXCLUDED.venue_id,
    h3_idx      = EXCLUDED.h3_idx;
  
  RETURN NEW;
END
$fn$;

-- Drop existing trigger and recreate
DROP TRIGGER IF EXISTS trg_presence_mirror ON public.presence;
CREATE TRIGGER trg_presence_mirror
  AFTER INSERT OR UPDATE ON public.presence
  FOR EACH ROW EXECUTE FUNCTION public.mirror_presence_to_vibes_now();

-- ====================================================================
-- 4. PERFORMANCE INDEXES
-- ====================================================================

-- Ensure presence table has proper indexes for location queries
CREATE INDEX IF NOT EXISTS idx_presence_profile 
  ON public.presence(profile_id);

CREATE INDEX IF NOT EXISTS idx_presence_h3_updated 
  ON public.presence(h3_idx, updated_at DESC) 
  WHERE h3_idx IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_geohash6_updated 
  ON public.presence(geohash6, updated_at DESC) 
  WHERE geohash6 IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_updated_at_desc 
  ON public.presence(updated_at DESC);

-- ====================================================================
-- 5. VENUE BBOX FUNCTION CLEANUP
-- ====================================================================

-- Remove ambiguous numeric overload, keep only double precision version
DROP FUNCTION IF EXISTS public.get_venues_in_bbox(numeric, numeric, numeric, numeric);

-- Ensure the double precision version exists and is properly defined
CREATE OR REPLACE FUNCTION public.get_venues_in_bbox(
  west double precision,
  south double precision,
  east double precision,
  north double precision
)
RETURNS TABLE(
  id text,
  name text,
  lat numeric,
  lng numeric,
  vibe text,
  source text,
  external_id text,
  categories text[],
  rating numeric,
  photo_url text,
  address text,
  live_count integer,
  popularity integer,
  vibe_score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id::text,
    v.name,
    ST_Y(v.geom::geometry) AS lat,
    ST_X(v.geom::geometry) AS lng,
    COALESCE(v.vibe, 'mixed') AS vibe,
    COALESCE(v.source, 'manual') AS source,
    COALESCE(v.external_id, v.id::text) AS external_id,
    COALESCE(v.categories, ARRAY[]::text[]) AS categories,
    v.rating,
    v.photo_url,
    v.address,
    COALESCE(v.live_count, 0) AS live_count,
    COALESCE(v.popularity, 0) AS popularity,
    COALESCE(v.vibe_score, 50.0) AS vibe_score,
    v.created_at,
    v.updated_at
  FROM public.venues v
  WHERE ST_Intersects(v.geom, ST_MakeEnvelope(west, south, east, north, 4326))
  ORDER BY v.popularity DESC, v.id;
END;
$$;

-- ====================================================================
-- 6. SECURITY AND PERMISSIONS
-- ====================================================================

-- Revoke public access and grant to authenticated users only
REVOKE EXECUTE ON FUNCTION public.upsert_presence_realtime_v2(double precision,double precision,text,double precision,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_presence_realtime_v2(double precision,double precision,text,double precision,bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_live_share(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_live_share(uuid,boolean) TO authenticated;

-- Handle bulk sharing function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_live_share_bulk'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[],boolean,auto_when_enum[]) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.set_live_share_bulk(uuid[],boolean,auto_when_enum[]) TO authenticated;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.upsert_presence_realtime_v2_text(double precision,double precision,text,double precision,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_presence_realtime_v2_text(double precision,double precision,text,double precision,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_visible_friend_presence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_friend_presence(uuid) TO authenticated;

-- ====================================================================
-- 7. COMMENTS AND DOCUMENTATION
-- ====================================================================

COMMENT ON FUNCTION public.set_live_share(uuid, boolean) IS 
  'Sets location sharing preference between current user and specified friend';

COMMENT ON FUNCTION public.get_visible_friend_presence(uuid) IS 
  'Returns visible friend presence data based on sharing preferences and privacy settings';

COMMENT ON FUNCTION public.mirror_presence_to_vibes_now() IS 
  'Trigger function to mirror presence updates to vibes_now table with proper visibility';

COMMENT ON FUNCTION public.upsert_presence_realtime_v2_text(double precision,double precision,text,double precision,text) IS 
  'Text wrapper for presence upsert function, handles H3 index as text input';

COMMIT;