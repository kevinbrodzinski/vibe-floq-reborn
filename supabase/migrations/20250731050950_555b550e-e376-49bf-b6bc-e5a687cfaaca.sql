BEGIN;

--──────────────────────────────────────────────────────────────────────────────
-- 1 ◂  PRICE-TIER ENUM & COLUMN
--──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_enum') THEN
    CREATE TYPE price_enum AS ENUM ('1','2','3','4');
  END IF;
END $$;

-- venues.price_tier → enum, indexed
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS price_tier price_enum DEFAULT '1';

CREATE INDEX IF NOT EXISTS idx_venues_price_tier ON public.venues(price_tier);

-- spatial index (if geom already exists)
CREATE INDEX IF NOT EXISTS idx_venues_geom
  ON public.venues USING gist (geom);

--──────────────────────────────────────────────────────────────────────────────
-- 2 ◂  USER VENUE INTERACTIONS TABLE
--──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_venue_interactions (
  id                  uuid PRIMARY KEY        DEFAULT gen_random_uuid(),
  profile_id          uuid    NOT NULL        REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_id            text    NOT NULL        REFERENCES public.venues(id) ON DELETE CASCADE,
  interaction_type    text    NOT NULL CHECK (interaction_type IN ('check_in','favorite','share','view')),
  interaction_count   int     NOT NULL DEFAULT 0,
  last_interaction_at timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, venue_id, interaction_type)
);

CREATE INDEX IF NOT EXISTS idx_uvi_profile_venue
  ON public.user_venue_interactions(profile_id, venue_id);

-- RLS
ALTER TABLE public.user_venue_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uvi_select_own  ON public.user_venue_interactions;
DROP POLICY IF EXISTS uvi_insert_own  ON public.user_venue_interactions;
DROP POLICY IF EXISTS uvi_update_own  ON public.user_venue_interactions;
DROP POLICY IF EXISTS uvi_delete_own  ON public.user_venue_interactions;

CREATE POLICY uvi_select_own
  ON public.user_venue_interactions
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY uvi_insert_own
  ON public.user_venue_interactions
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY uvi_update_own
  ON public.user_venue_interactions
  FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY uvi_delete_own
  ON public.user_venue_interactions
  FOR DELETE
  USING (auth.uid() = profile_id);

--──────────────────────────────────────────────────────────────────────────────
-- 3 ◂  PERSONALIZED SCORE FUNCTION
--──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_personalized_venue_score(
  p_profile_id uuid,
  p_venue_id   text,
  p_base_score numeric DEFAULT 0.5
) RETURNS numeric
LANGUAGE plpgsql
STRICT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  checkins  int := 0;
  favorites int := 0;
BEGIN
  SELECT
      COALESCE(SUM(CASE WHEN interaction_type = 'check_in' THEN interaction_count END),0),
      COALESCE(SUM(CASE WHEN interaction_type = 'favorite' THEN interaction_count END),0)
  INTO  checkins, favorites
  FROM  public.user_venue_interactions
  WHERE profile_id = p_profile_id
    AND venue_id   = p_venue_id;

  RETURN LEAST(p_base_score + checkins*0.3 + favorites*0.5, 1.0);
END $$;

GRANT EXECUTE ON FUNCTION public.get_personalized_venue_score(uuid,text,numeric)
  TO authenticated;

--──────────────────────────────────────────────────────────────────────────────
-- 4 ◂  ENHANCED venues_within_radius RPC
--──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venues_within_radius(
  p_lat             numeric,
  p_lng             numeric,
  p_radius_m        int              DEFAULT 1000,
  p_limit           int              DEFAULT 20,
  p_profile_id      uuid             DEFAULT NULL,
  p_categories      text[]           DEFAULT NULL,
  p_price_tier_max  price_enum       DEFAULT '4',
  p_vibe            text             DEFAULT NULL
) RETURNS TABLE (
  venue_id           text,
  name               text,
  distance_m         int,
  rating             numeric,
  categories         text[],
  description        text,
  address            text,
  photo_url          text,
  live_count         int,
  price_tier         price_enum,
  personalized_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id                                     AS venue_id,
    v.name,
    TRUNC( ST_Distance(
            v.geom::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
          ) )::int                          AS distance_m,
    v.rating,
    v.categories,
    v.description,
    v.address,
    v.photo_url,
    COALESCE(v.live_count, 0)               AS live_count,
    COALESCE(v.price_tier,'1')              AS price_tier,
    CASE
      WHEN p_profile_id IS NOT NULL THEN
        get_personalized_venue_score(p_profile_id, v.id,
                                     COALESCE(v.rating/5.0,0.5))
      ELSE
        COALESCE(v.rating/5.0,0.5)
    END                                     AS personalized_score
  FROM   public.venues v
  WHERE  ST_DWithin(
           v.geom::geography,
           ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
           p_radius_m
         )
    AND (p_categories   IS NULL OR v.categories && p_categories)
    AND (p_price_tier_max IS NULL OR v.price_tier <= p_price_tier_max)
    AND (p_vibe IS NULL OR p_vibe = ANY(v.categories))
  ORDER  BY personalized_score DESC, distance_m ASC
  LIMIT  p_limit;
END $$;

GRANT EXECUTE ON FUNCTION public.venues_within_radius(
  numeric,numeric,int,int,uuid,text[],price_enum,text)
  TO authenticated;

COMMIT;