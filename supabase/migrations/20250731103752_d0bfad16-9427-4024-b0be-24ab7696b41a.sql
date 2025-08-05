-- Fix venues_within_radius function - remove incorrect text cast
CREATE OR REPLACE FUNCTION public.venues_within_radius(
  p_lat numeric, 
  p_lng numeric, 
  p_radius_m integer DEFAULT 1000, 
  p_limit integer DEFAULT 20, 
  p_profile_id uuid DEFAULT NULL::uuid, 
  p_categories text[] DEFAULT NULL::text[], 
  p_price_tier_max price_enum DEFAULT '$$$$'::price_enum, 
  p_vibe text DEFAULT NULL::text
)
RETURNS TABLE(
  venue_id uuid, 
  name text, 
  distance_m integer, 
  rating numeric, 
  categories text[], 
  description text, 
  address text, 
  photo_url text, 
  live_count integer, 
  price_tier price_enum, 
  personalized_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    ROUND(
      ST_Distance(
        v.geom::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326)::geography
      )
    )::int                                     AS distance_m,
    v.rating,
    v.categories,
    v.description,
    v.address,
    v.photo_url,
    COALESCE(v.live_count,0)                   AS live_count,
    COALESCE(v.price_tier, '$'::price_enum)    AS price_tier,
    CASE
      WHEN p_profile_id IS NOT NULL THEN
        get_personalized_venue_score(
          p_profile_id,
          v.id,                                 -- Remove ::text cast - function expects uuid
          COALESCE(v.rating/5.0,0.5)
        )
      ELSE
        COALESCE(v.rating/5.0,0.5)
    END                                         AS personalized_score
  FROM   public.venues v
  WHERE  ST_DWithin(
           v.geom::geography,
           ST_SetSRID(ST_MakePoint(p_lng,p_lat),4326)::geography,
           p_radius_m
         )
    AND (p_categories IS NULL OR v.categories && p_categories)
    AND COALESCE(v.price_tier, '$'::price_enum) <= p_price_tier_max
    AND (p_vibe IS NULL OR p_vibe = ANY(v.categories))
  ORDER BY personalized_score DESC, distance_m
  LIMIT  p_limit;
END;
$function$