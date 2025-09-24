-- =========================================================
-- APPLIED BUNDLE: nearby RPC (6-arg) + friends helpers
-- Safe, idempotent, no explicit transactions
-- =========================================================
SET search_path = public;

-- 1) Helper: current_profile_id()
--    Your profiles/auth IDs are the same, so this is just auth.uid().
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid()::uuid
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

-- 2) Helper: friend_ids_for(p_profile)
--    Uses friendships(profile_low, profile_high, friend_state)
--    Returns one column named friend_id
CREATE OR REPLACE FUNCTION public.friend_ids_for(p_profile uuid)
RETURNS TABLE(friend_id uuid)
LANGUAGE sql
STABLE
AS $$
  SELECT
    CASE
      WHEN f.profile_low  = p_profile THEN f.profile_high
      ELSE                               f.profile_low
    END AS friend_id
  FROM public.friendships f
  WHERE f.friend_state = 'accepted'::public.friend_state
    AND (f.profile_low = p_profile OR f.profile_high = p_profile)
$$;

GRANT EXECUTE ON FUNCTION public.friend_ids_for(uuid) TO authenticated;

-- 3) RPC: friends_recent_at_venue(p_venue_id, p_days default 14)
--    SECURITY DEFINER so it can resolve current_profile_id() in RLS contexts.
--    NOTE: Shows timestamps as stored (no tz conversion) per "keep DB UTC; render local in app" model.
CREATE OR REPLACE FUNCTION public.friends_recent_at_venue(
  p_venue_id uuid,
  p_days     integer DEFAULT 14
)
RETURNS TABLE(
  friend_profile_id uuid,
  friend_name       text,
  arrived_at        timestamptz,
  departed_at       timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT public.current_profile_id() AS pid
  ),
  fr AS (
    SELECT friend_id FROM public.friend_ids_for((SELECT pid FROM me))
  )
  SELECT
    v.profile_id                                           AS friend_profile_id,
    COALESCE(pr.display_name, pr.username)                 AS friend_name,
    v.arrived_at,
    v.departed_at
  FROM public.venue_visits v
  JOIN fr ON fr.friend_id = v.profile_id
  LEFT JOIN public.profiles pr ON pr.id = v.profile_id
  WHERE v.venue_id = p_venue_id
    AND v.arrived_at >= now() - make_interval(days => p_days)
  ORDER BY v.arrived_at DESC
  LIMIT 50
$$;

GRANT EXECUTE ON FUNCTION public.friends_recent_at_venue(uuid, integer) TO authenticated;

-- 4) Nearby RPC: canonical 6-arg version ONLY
--    Drop older overloads to remove ambiguity.
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer,text[],text[]);
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer);
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer,integer);

CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat        double precision,
  p_lng        double precision,
  p_radius_m   integer,
  p_limit      integer,
  p_any_tags   text[] DEFAULT NULL,
  p_all_tags   text[] DEFAULT NULL
)
RETURNS TABLE(
  id              uuid,
  name            text,
  distance_m      numeric,
  lat             numeric,
  lng             numeric,
  categories      text[],
  provider        text,
  photo_url       text,
  vibe_tag        text,
  vibe_score      numeric,
  live_count      integer,
  canonical_tags  text[]
)
LANGUAGE sql
STABLE
AS $$
  WITH origin AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g
  ),
  wish AS (
    SELECT
      public.pill_keys_to_canonical_tags(p_any_tags) AS any_wanted,
      public.pill_keys_to_canonical_tags(p_all_tags) AS all_wanted
  )
  SELECT
    v.id,
    v.name,
    ST_Distance(v.location, o.g) AS distance_m,
    v.lat::numeric,
    v.lng::numeric,
    v.categories,
    v.provider,
    v.photo_url,
    v.vibe       AS vibe_tag,
    v.vibe_score,
    v.live_count,
    COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name))::text[] AS canonical_tags
  FROM public.venues v
  CROSS JOIN origin o
  CROSS JOIN wish   w
  WHERE v.location IS NOT NULL
    AND ST_DWithin(v.location, o.g, p_radius_m)
    AND (
      w.any_wanted IS NULL
      OR array_length(w.any_wanted, 1) IS NULL
      OR (COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) && w.any_wanted)
    )
    AND (
      w.all_wanted IS NULL
      OR array_length(w.all_wanted, 1) IS NULL
      OR (COALESCE(v.canonical_tags, public.canonicalize_venue_enum(v.provider, v.categories, v.name)) @> w.all_wanted)
    )
  ORDER BY distance_m ASC, v.popularity DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1)
$$;

GRANT EXECUTE ON FUNCTION public.get_nearby_venues(
  double precision,double precision,integer,integer,text[],text[]
) TO authenticated;