-- Fix comment in rank_nearby_people function to match actual implementation  
DROP FUNCTION IF EXISTS public.rank_nearby_people(double precision, double precision, integer);

CREATE OR REPLACE FUNCTION public.rank_nearby_people(p_lat double precision, p_lng double precision, p_limit integer DEFAULT 12)
RETURNS TABLE(profile_id uuid, vibe text, meters integer, synthetic_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326) AS g
  )
  SELECT
    vn.profile_id,
    vn.vibe::text,
    ST_Distance(vn.location::geography, me.g::geography)::int AS meters,
    CASE 
      WHEN vn.profile_id IS NULL THEN 'demo-' || md5(vn.vibe || vn.location::text || vn.updated_at::text)
      ELSE vn.profile_id::text
    END as synthetic_id
  FROM   vibes_now vn,
         me
  WHERE  vn.visibility = 'public'
    AND  (auth.uid() IS NULL OR vn.profile_id IS NULL OR vn.profile_id <> auth.uid())
    AND  vn.updated_at > now() - interval '15 minutes'
  ORDER  BY vn.location <-> me.g
  LIMIT  p_limit;
$function$