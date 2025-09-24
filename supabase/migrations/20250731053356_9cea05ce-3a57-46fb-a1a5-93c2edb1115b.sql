-- 1️⃣  enum (drop only if safe)
-- ALTER TYPE recommended instead of DROP … CASCADE in production
DROP TYPE IF EXISTS price_enum CASCADE;
CREATE TYPE price_enum AS ENUM ('$', '$$', '$$$', '$$$$');


-- 2️⃣  upsert helper
CREATE OR REPLACE FUNCTION public.bump_interaction(
  p_profile_id uuid,
  p_venue_id   text,             -- keep in sync with table column type
  p_type       text              -- ('check_in','favorite',…)
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_venue_interactions
    (profile_id, venue_id, interaction_type,
     interaction_count, last_interaction_at)
  VALUES
    (p_profile_id, p_venue_id, p_type, 1, now())
  ON CONFLICT (profile_id, venue_id, interaction_type)
  DO UPDATE SET
     interaction_count  = user_venue_interactions.interaction_count + 1,
     last_interaction_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_interaction(uuid,text,text) TO authenticated;


-- 3️⃣  personalised venue lookup
CREATE OR REPLACE FUNCTION public.venues_within_radius(
  p_lat            numeric,
  p_lng            numeric,
  p_radius_m       integer     DEFAULT 1000,
  p_limit          integer     DEFAULT 20,
  p_profile_id     uuid        DEFAULT NULL,
  p_categories     text[]      DEFAULT NULL,
  p_price_tier_max price_enum  DEFAULT '$$$$',
  p_vibe           text        DEFAULT NULL
)
RETURNS TABLE(
  venue_id          uuid,
  name              text,
  distance_m        integer,
  rating            numeric,
  categories        text[],
  description       text,
  address           text,
  photo_url         text,
  live_count        integer,
  price_tier        price_enum,
  personalized_score numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public AS $$
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
    COALESCE(v.live_count,0)                   AS live_count,      -- adjust if join needed
    COALESCE(v.price_tier, '$'::price_enum)    AS price_tier,
    CASE
      WHEN p_profile_id IS NOT NULL THEN
        get_personalized_venue_score(
          p_profile_id,
          v.id::text,                           -- cast if function expects text
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
    AND v.price_tier <= p_price_tier_max
    AND (p_vibe IS NULL OR p_vibe = ANY(v.categories))
  ORDER BY personalized_score DESC, distance_m
  LIMIT  p_limit;
END;
$$;