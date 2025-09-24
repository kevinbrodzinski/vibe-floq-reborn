-- Drop the older function with vibe_enum[] parameter type and different signature
DROP FUNCTION IF EXISTS public.search_floqs(
  p_lat double precision, 
  p_lng double precision, 
  p_radius_km numeric, 
  p_vibe_ids vibe_enum[], 
  p_query text, 
  p_time_from timestamp with time zone, 
  p_time_to timestamp with time zone, 
  p_visibilities text[], 
  p_limit integer
);