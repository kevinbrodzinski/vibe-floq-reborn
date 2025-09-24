-- RPC function to get friend trail data
CREATE OR REPLACE FUNCTION public.get_friend_trail(
  friend_user_id uuid,
  hours_back integer DEFAULT 24,
  point_limit integer DEFAULT 50
)
RETURNS TABLE(
  lat numeric,
  lng numeric,
  captured_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ST_Y(geom) as lat,
    ST_X(geom) as lng,
    captured_at
  FROM raw_locations
  WHERE user_id = friend_user_id
    AND captured_at >= (now() - (hours_back || ' hours')::interval)
  ORDER BY captured_at DESC
  LIMIT point_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_trail(uuid, integer, integer) TO authenticated;