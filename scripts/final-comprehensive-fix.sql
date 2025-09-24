-- Final Comprehensive Fix Migration
-- Fixes the "relation does not exist" error and updates all user_id -> profile_id references

BEGIN;

-- 1. Fix get_social_suggestions function that references dropped friend_presence table
DROP FUNCTION IF EXISTS public.get_social_suggestions(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_social_suggestions(
  p_uid        uuid,
  max_dist_m   integer DEFAULT 1000,
  limit_n      integer DEFAULT 5
)
RETURNS TABLE (
  friend_id    uuid,
  display_name text,
  avatar_url   text,
  vibe_tag     vibe_enum,
  vibe_match   real,
  distance_m   real,
  started_at   timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vn.profile_id as friend_id,
    pr.display_name,
    pr.avatar_url,
    vn.vibe::vibe_enum as vibe_tag,
    COALESCE(vibe_similarity(uvs.vibe_tag, vn.vibe::vibe_enum), 0) AS vibe_match,
    ST_DistanceSphere(vn.location::geometry, uvs.location::geometry)::real AS distance_m,
    vn.updated_at as started_at
  FROM public.vibes_now vn
  JOIN public.profiles pr ON pr.id = vn.profile_id
  LEFT JOIN LATERAL (
    SELECT v.location, v.vibe_tag
    FROM public.user_vibe_states v
    WHERE v.profile_id = p_uid AND v.active
    LIMIT 1
  ) AS uvs ON TRUE
  WHERE vn.profile_id != p_uid  -- Exclude self
    AND vn.location IS NOT NULL
    AND uvs.location IS NOT NULL
    AND ST_DistanceSphere(vn.location::geometry, uvs.location::geometry) <= max_dist_m
    AND vn.expires_at > now()  -- Only active vibes
  ORDER BY
    vibe_match DESC,
    distance_m ASC,
    vn.updated_at DESC
  LIMIT limit_n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_social_suggestions(uuid, integer, integer) TO authenticated;

-- 2. Update indexes that reference user_id
DROP INDEX IF EXISTS idx_vibes_now_user_id;
CREATE INDEX IF NOT EXISTS idx_vibes_now_profile_id ON public.vibes_now(profile_id);

DROP INDEX IF EXISTS idx_fav_user;
CREATE INDEX IF NOT EXISTS idx_fav_profile ON public.user_favorites(profile_id);

DROP INDEX IF EXISTS idx_vnm_user_latlng;
CREATE INDEX IF NOT EXISTS idx_vnm_profile_latlng ON public.venues_near_me(profile_id, lat, lng);

DROP INDEX IF EXISTS vibes_now_user_id_idx;
CREATE INDEX IF NOT EXISTS vibes_now_profile_id_idx ON vibes_now(profile_id);

DROP INDEX IF EXISTS user_vibe_states_user_id_active_idx;
CREATE INDEX IF NOT EXISTS user_vibe_states_profile_id_active_idx ON user_vibe_states(profile_id) WHERE active = true;

-- 3. Update RLS policies to use profile_id
-- Vibes_now policies
DROP POLICY IF EXISTS "Users can view their own vibes" ON public.vibes_now;
CREATE POLICY "Users can view their own vibes" ON public.vibes_now
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own vibes" ON public.vibes_now;
CREATE POLICY "Users can insert their own vibes" ON public.vibes_now
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own vibes" ON public.vibes_now;
CREATE POLICY "Users can update their own vibes" ON public.vibes_now
  FOR UPDATE USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- User_vibe_states policies
DROP POLICY IF EXISTS "Users can view their own vibe states" ON public.user_vibe_states;
CREATE POLICY "Users can view their own vibe states" ON public.user_vibe_states
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own vibe states" ON public.user_vibe_states;
CREATE POLICY "Users can insert their own vibe states" ON public.user_vibe_states
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- User_favorites policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
CREATE POLICY "Users can view their own favorites" ON public.user_favorites
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.user_favorites;
CREATE POLICY "Users can insert their own favorites" ON public.user_favorites
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- 4. Update user_credential table policy
DROP POLICY IF EXISTS "owner" ON integrations.user_credential;
CREATE POLICY "owner" ON integrations.user_credential
  USING (profile_id = auth.uid());

-- 5. Update the normalise_place_feed function to use profile_id
CREATE OR REPLACE FUNCTION integrations.normalise_place_feed()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  ins INT;
BEGIN
  WITH batch AS (
    SELECT id, profile_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    LIMIT 200
  ), parsed AS (
    SELECT id, profile_id,
           jsonb_array_elements(
             CASE provider_id
               WHEN 1 THEN payload->'results'    -- Google
               WHEN 2 THEN payload->'results'    -- Foursquare
             END
           ) AS item
    FROM batch
  ), up AS (
    INSERT INTO public.venue_visits(profile_id, venue_id, arrived_at, distance_m)
    SELECT p.profile_id,
           v.id,
           now(),
           25
    FROM   parsed p
    JOIN   public.venues v
       ON  v.external_id = COALESCE(p.item->>'place_id', p.item->>'fsq_id')
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  UPDATE integrations.place_feed_raw
     SET processed_at = now()
   WHERE id IN (SELECT id FROM batch);

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END $$;

COMMIT; 