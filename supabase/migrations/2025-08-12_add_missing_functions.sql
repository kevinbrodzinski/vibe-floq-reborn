-- Add missing get_cluster_venues function
-- This function is used by useVenuesNearMe hook for venue clustering

begin;

CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng          double precision,
  min_lat          double precision,
  max_lng          double precision,
  max_lat          double precision,
  cursor_popularity integer DEFAULT NULL,
  cursor_id         text    DEFAULT NULL,
  limit_rows        integer DEFAULT 10
)
RETURNS TABLE (
  id          uuid,
  name        text,
  lat         double precision,
  lng         double precision,
  dist_m      int,
  rating      numeric,
  popularity  integer,
  price_tier  public.price_enum,
  categories  text[]
)
LANGUAGE sql
STABLE
AS $$
  with bbox as (
    select st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326) as geom
  ),
  center as (
    select st_centroid((select geom from bbox))::geography as pt
  )
  select
    v.id,
    v.name,
    v.lat,
    v.lng,
    cast(st_distance(v.geom::geography, (select pt from center)) as int) as dist_m,
    v.rating,
    coalesce(v.popularity, 0) as popularity,
    v.price_tier,
    v.categories
  from public.venues v, bbox
  where v.geom is not null
    and v.geom && bbox.geom
    and st_intersects(v.geom, bbox.geom)
    and (
      cursor_popularity is null
      or (coalesce(v.popularity, 0), v.id::text) < (cursor_popularity, cursor_id)
    )
  order by coalesce(v.popularity, 0) desc, v.id desc
  limit limit_rows;
$$;

COMMENT ON FUNCTION public.get_cluster_venues IS
'Return up to limit_rows venues inside bbox, ordered by popularity DESC / id DESC.
Supports key-set pagination via (cursor_popularity, cursor_id).';

GRANT EXECUTE ON FUNCTION public.get_cluster_venues TO authenticated;

-- Additional helper function for venues near me (alternative to clustering)
create or replace function public.get_venues_near_me(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 2000,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  name text,
  lat double precision,
  lng double precision,
  dist_m int,
  rating numeric,
  popularity int,
  price_tier public.price_enum,
  categories text[]
)
language sql
stable
as $$
  with pt as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography g
  )
  select
    v.id, v.name,
    v.lat, v.lng,  -- use columns, avoids geography cast entirely
    cast(st_distance(v.geom::geography, (select g from pt)) as int) as dist_m,
    v.rating, coalesce(v.popularity, 0) as popularity, v.price_tier, v.categories
  from public.venues v
  where v.geom is not null
    and st_dwithin(v.geom::geography, (select g from pt), p_radius_m)
  order by dist_m asc
  limit p_limit offset p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_venues_near_me TO authenticated;

commit;