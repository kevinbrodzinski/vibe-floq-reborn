
-- Enable PostGIS if you haven't already
CREATE EXTENSION IF NOT EXISTS postgis;

--------------------------------------------------------------------
-- RPC: venue_details  
--------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.venue_details(uuid);

CREATE OR REPLACE FUNCTION public.venue_details(v_id uuid)
RETURNS TABLE (
  id          uuid,
  name        text,
  vibe        text,
  description text,
  live_count  int,
  lat         numeric,
  lng         numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id,
         v.name,
         v.vibe,
         v.description,
         COALESCE(vc.live_count, 0) AS live_count,
         v.lat,
         v.lng
  FROM   public.venues v
  LEFT JOIN (
    SELECT   venue_id,
             COUNT(*) AS live_count
    FROM     public.vibes_now
    WHERE    expires_at > NOW()
    GROUP BY venue_id
  ) vc ON vc.venue_id = v.id
  WHERE  v.id = v_id
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.venue_details TO authenticated;
