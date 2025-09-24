-- Comprehensive Fix Migration
-- Fixes the "relation does not exist" error and uses the updated profile_id schema

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

-- 2. Update user_credential table to use profile_id (already done in database)
-- The table should already have profile_id column, just ensure the policy is correct
DROP POLICY IF EXISTS "owner" ON integrations.user_credential;

CREATE POLICY "owner" ON integrations.user_credential
  USING (profile_id = auth.uid());

-- 3. Update the normalise_place_feed function to use profile_id
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