
-- Enable PostGIS if not already (idempotent safety)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1️⃣  RPC: return online friends within N km
DROP FUNCTION IF EXISTS public.friends_nearby(numeric,numeric,numeric);
CREATE OR REPLACE FUNCTION public.friends_nearby(
  user_lat NUMERIC,        -- caller's lat
  user_lng NUMERIC,        -- caller's lng
  radius_km NUMERIC DEFAULT 1   -- search radius km
)
RETURNS TABLE (
  id           UUID,
  display_name TEXT,
  avatar_url   TEXT,
  lat          NUMERIC,
  lng          NUMERIC,
  distance_m   NUMERIC   -- great-circle distance in metres
)  
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  -- caller's friendship set
  my_friends AS (
    SELECT CASE 
             WHEN f.user_id = auth.uid() THEN f.friend_id
             ELSE f.user_id
           END AS friend_id
    FROM public.friendships f
    WHERE f.user_id = auth.uid() OR f.friend_id = auth.uid()
  ),

  -- latest presence rows for those friends
  friend_presence AS (
    SELECT DISTINCT ON (v.user_id)
           v.user_id,
           v.geo,
           ST_Y(v.location::geometry) as lat,
           ST_X(v.location::geometry) as lng,
           v.updated_at
    FROM public.vibes_now v
    JOIN my_friends mf ON mf.friend_id = v.user_id
    WHERE v.expires_at > NOW()
    ORDER BY v.user_id, v.updated_at DESC
  )

  SELECT
    p.id,
    p.display_name,
    p.avatar_url,
    fp.lat,
    fp.lng,
    ST_Distance(
      fp.geo,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat),4326)::geography
    )   AS distance_m
  FROM friend_presence fp
  JOIN public.profiles p ON p.id = fp.user_id
  WHERE ST_DWithin(
          fp.geo,
          ST_SetSRID(ST_MakePoint(user_lng, user_lat),4326)::geography,
          radius_km * 1000  -- metres
        )
  ORDER BY distance_m
  LIMIT 50;
$$;

-- 2️⃣  Grants
GRANT EXECUTE ON FUNCTION public.friends_nearby TO authenticated;
