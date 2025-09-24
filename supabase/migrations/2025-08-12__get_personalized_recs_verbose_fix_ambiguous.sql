-- 2025-08-12__get_personalized_recs_verbose_fix_ambiguous.sql
begin;

create or replace function public.get_personalized_recs_verbose(
  p_profile_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 3000,
  p_now timestamptz default now(),
  p_vibe text default null,
  p_tags text[] default null,
  p_tz text default 'America/Los_Angeles',
  p_limit int default 20,
  p_ab text default null,
  p_log boolean default true
)
returns table(
  venue_id uuid,
  name text,
  address text,
  lat double precision,
  lng double precision,
  dist_m int,
  walk_min int,
  price_tier public.price_enum,
  rating numeric,
  popularity int,
  categories text[],
  score numeric,
  components jsonb,
  weights jsonb,
  badges text[],
  reason text,
  provider text,
  provider_id text,
  photo_url text,
  external_id text,
  geohash5 text
)
language plpgsql stable
as $fn$
declare
  pt geography := st_setsrid(st_makepoint(p_lng, p_lat),4326)::geography;
begin
  -- main pipeline
  return query
  with tastes as (
    select * from public.user_tastes where profile_id = p_profile_id
  ),
  w as (
    select
      coalesce((ut.model_weights->>'w_distance')::numeric,(uw.weights->>'w_distance')::numeric,vw.w_distance,dv.w_distance) as w_distance,
      coalesce((ut.model_weights->>'w_rating')::numeric,(uw.weights->>'w_rating')::numeric,vw.w_rating,dv.w_rating) as w_rating,
      coalesce((ut.model_weights->>'w_popularity')::numeric,(uw.weights->>'w_popularity')::numeric,vw.w_popularity,dv.w_popularity) as w_popularity,
      coalesce((ut.model_weights->>'w_tag_match')::numeric,(uw.weights->>'w_tag_match')::numeric,vw.w_tag_match,dv.w_tag_match) as w_tag_match,
      coalesce((ut.model_weights->>'w_cuisine_match')::numeric,(uw.weights->>'w_cuisine_match')::numeric,vw.w_cuisine_match,dv.w_cuisine_match) as w_cuisine_match,
      coalesce((ut.model_weights->>'w_price_fit')::numeric,(uw.weights->>'w_price_fit')::numeric,vw.w_price_fit,dv.w_price_fit) as w_price_fit,
      coalesce((ut.model_weights->>'bias')::numeric,0) as w_bias
    from (select * from public.rec_vibe_weights where vibe = coalesce(p_vibe,'default')) vw
    full join (select * from public.rec_vibe_weights where vibe = 'default') dv on true
    left join public.rec_user_vibe_weights uw
      on uw.vibe = coalesce(p_vibe,'default') and uw.profile_id = p_profile_id
    left join public.user_tastes ut on ut.profile_id = p_profile_id
    limit 1
  ),
  ctx as (
    select
      coalesce((select preferred_tags     from tastes), '{}') pref_tags,
      coalesce((select disliked_tags      from tastes), '{}') bad_tags,
      coalesce((select preferred_cuisines from tastes), '{}') pref_cuisines,
      coalesce((select disliked_cuisines  from tastes), '{}') bad_cuisines,
      coalesce((select price_min from tastes), null) pmin,
      coalesce((select price_max from tastes), null) pmax
  ),
  price as (
    select v.id,
           case
             when v.price_tier is null then null
             when v.price_tier::text ~ '^\$+$' then length(v.price_tier::text)
             else null
           end as price_num
    from public.venues v
  ),
  base as (
    select v.id, v.name, v.address, v.lat, v.lng, v.price_tier, v.rating, v.popularity,
           v.categories, v.provider, v.provider_id, v.photo_url, v.external_id, v.geohash5,
           cast(st_distance(v.geom::geography, pt) as int) dist_m,
           p.price_num
    from public.venues v
    left join price p on p.id = v.id
    where v.geom is not null
      and st_dwithin(v.geom::geography, pt, p_radius_m)
      and (p_tags is null or v.categories && p_tags)
  ),
  filtered as (
    select b.*
    from base b, ctx
    where (ctx.pmin is null or coalesce(b.price_num, 999) >= ctx.pmin)
      and (ctx.pmax is null or coalesce(b.price_num, 1)   <= ctx.pmax)
      and not (b.categories && ctx.bad_tags)
      and not (b.categories && ctx.bad_cuisines)
  ),
  scored as (
    select
      f.*,
      (1 - least(f.dist_m::numeric / greatest(p_radius_m,1), 1)) as c_distance,
      coalesce((f.rating/5.0), 0)                                as c_rating,
      coalesce((f.popularity::numeric / 100.0), 0)               as c_popularity,
      case when p_vibe is not null and f.categories @> array[p_vibe] then 1 else 0 end as c_tag_match,
      case when f.categories && coalesce((select pref_cuisines from ctx), '{}') then 1 else 0 end as c_cuisine_match,
      case when f.price_num is not null then 1 else 0 end as c_price_fit
    from filtered f
  ),
  final as (
    select
      s.id as venue_id, s.name, s.address, s.lat, s.lng, s.dist_m,
      ceil(s.dist_m::numeric / 80.0)::int as walk_min,
      s.price_tier, s.rating, s.popularity, s.categories,
      (
        s.c_distance   * (select w_distance   from w) +
        s.c_rating     * (select w_rating     from w) +
        s.c_popularity * (select w_popularity from w) +
        s.c_tag_match  * (select w_tag_match  from w) +
        s.c_cuisine_match * (select w_cuisine_match from w) +
        s.c_price_fit  * (select w_price_fit  from w) +
        (select w_bias from w)
      ) as score,
      jsonb_build_object(
        'c_distance', s.c_distance,
        'c_rating', s.c_rating,
        'c_popularity', s.c_popularity,
        'c_tag_match', s.c_tag_match,
        'c_cuisine_match', s.c_cuisine_match,
        'c_price_fit', s.c_price_fit,
        'weighted', jsonb_build_object(
          'distance',   s.c_distance   * (select w_distance   from w),
          'rating',     s.c_rating     * (select w_rating     from w),
          'popularity', s.c_popularity * (select w_popularity from w),
          'tag_match',  s.c_tag_match  * (select w_tag_match  from w),
          'cuisine',    s.c_cuisine_match * (select w_cuisine_match from w),
          'price_fit',  s.c_price_fit  * (select w_price_fit  from w),
          'bias',       (select w_bias from w)
        )
      ) as components,
      jsonb_build_object(
        'w_distance',   (select w_distance   from w),
        'w_rating',     (select w_rating     from w),
        'w_popularity', (select w_popularity from w),
        'w_tag_match',  (select w_tag_match  from w),
        'w_cuisine_match', (select w_cuisine_match from w),
        'w_price_fit',  (select w_price_fit  from w),
        'bias',         (select w_bias from w)
      ) as weights,
      array(
        select b from unnest(array[
          (case when p_vibe is not null and s.c_tag_match=1 then 'Matches vibe' end),
          (case when s.dist_m <= 800 then 'Walkable' end),
          (case when s.rating >= 4.5 then 'Top rated' end),
          (case when s.popularity >= 70 then 'Popular now' end),
          (case when s.price_num is not null then 'In budget' end)
        ]) as b
        where b is not null
      ) as badges,
      array_to_string(
        array(
          select b from unnest(array[
            (case when p_vibe is not null and s.c_tag_match=1 then 'Matches vibe' end),
            (case when s.dist_m <= 800 then 'Walkable' end),
            (case when s.rating >= 4.5 then 'Top rated' end),
            (case when s.popularity >= 70 then 'Popular now' end),
            (case when s.price_num is not null then 'In budget' end)
          ]) as b
          where b is not null
        ),
        ' · '
      ) as reason,
      s.provider, s.provider_id, s.photo_url, s.external_id, s.geohash5
    from scored s
    order by score desc, dist_m asc
    limit p_limit
  )
  select * from final;

  -- logging (alias ranked as r to avoid OUT param ambiguity)
  if p_log and p_profile_id is not null then
    with tastes as (
      select * from public.user_tastes where profile_id = p_profile_id
    ),
    w as (
      select
        coalesce((ut.model_weights->>'w_distance')::numeric,(uw.weights->>'w_distance')::numeric,vw.w_distance,dv.w_distance) as w_distance,
        coalesce((ut.model_weights->>'w_rating')::numeric,(uw.weights->>'w_rating')::numeric,vw.w_rating,dv.w_rating) as w_rating,
        coalesce((ut.model_weights->>'w_popularity')::numeric,(uw.weights->>'w_popularity')::numeric,vw.w_popularity,dv.w_popularity) as w_popularity,
        coalesce((ut.model_weights->>'w_tag_match')::numeric,(uw.weights->>'w_tag_match')::numeric,vw.w_tag_match,dv.w_tag_match) as w_tag_match,
        coalesce((ut.model_weights->>'w_cuisine_match')::numeric,(uw.weights->>'w_cuisine_match')::numeric,vw.w_cuisine_match,dv.w_cuisine_match) as w_cuisine_match,
        coalesce((ut.model_weights->>'w_price_fit')::numeric,(uw.weights->>'w_price_fit')::numeric,vw.w_price_fit,dv.w_price_fit) as w_price_fit,
        coalesce((ut.model_weights->>'bias')::numeric,0) as w_bias
      from (select * from public.rec_vibe_weights where vibe = coalesce(p_vibe,'default')) vw
      full join (select * from public.rec_vibe_weights where vibe = 'default') dv on true
      left join public.rec_user_vibe_weights uw
        on uw.vibe = coalesce(p_vibe,'default') and uw.profile_id = p_profile_id
      left join public.user_tastes ut on ut.profile_id = p_profile_id
      limit 1
    ),
    ctx as (
      select
        coalesce((select preferred_cuisines from tastes), '{}') pref_cuisines,
        coalesce((select price_min from tastes), null) pmin,
        coalesce((select price_max from tastes), null) pmax,
        coalesce((select disliked_tags from tastes), '{}') bad_tags,
        coalesce((select disliked_cuisines from tastes), '{}') bad_cuisines
    ),
    price as (
      select v.id,
             case
               when v.price_tier is null then null
               when v.price_tier::text ~ '^\$+$' then length(v.price_tier::text)
               else null
             end as price_num
      from public.venues v
    ),
    base as (
      select v.id, v.name,
             cast(st_distance(v.geom::geography, pt) as int) dist_m,
             v.categories, v.rating, v.popularity, p.price_num
      from public.venues v
      left join price p on p.id = v.id
      where v.geom is not null
        and st_dwithin(v.geom::geography, pt, p_radius_m)
        and (p_tags is null or v.categories && p_tags)
    ),
    filtered as (
      select b.*
      from base b, ctx
      where (ctx.pmin is null or coalesce(b.price_num, 999) >= ctx.pmin)
        and (ctx.pmax is null or coalesce(b.price_num, 1)   <= ctx.pmax)
        and not (b.categories && ctx.bad_tags)
        and not (b.categories && ctx.bad_cuisines)
    ),
    scored as (
      select
        f.id as venue_id,
        (1 - least(f.dist_m::numeric / greatest(p_radius_m,1), 1)) as c_distance,
        coalesce((f.rating/5.0), 0)                                as c_rating,
        coalesce((f.popularity::numeric / 100.0), 0)               as c_popularity,
        case when p_vibe is not null and f.categories @> array[p_vibe] then 1 else 0 end as c_tag_match,
        case when f.categories && coalesce((select pref_cuisines from ctx), '{}') then 1 else 0 end as c_cuisine_match,
        case when f.price_num is not null then 1 else 0 end as c_price_fit
      from filtered f
    ),
    ranked as (
      select
        s.venue_id,
        (
          s.c_distance   * (select w_distance   from w) +
          s.c_rating     * (select w_rating     from w) +
          s.c_popularity * (select w_popularity from w) +
          s.c_tag_match  * (select w_tag_match  from w) +
          s.c_cuisine_match * (select w_cuisine_match from w) +
          s.c_price_fit  * (select w_price_fit  from w) +
          (select w_bias from w)
        ) as score
      from scored s
      order by score desc
      limit p_limit
    )
    insert into public.recommendation_events (profile_id, context, candidate_ids, scores, top_ids, ab_bucket)
    select
      p_profile_id,
      jsonb_build_object('lat', p_lat, 'lng', p_lng, 'radius_m', p_radius_m,
                         'now', p_now, 'tz', p_tz, 'vibe', p_vibe, 'tags', p_tags),
      (select array_agg(r.venue_id order by r.score desc) from ranked r),
      (select array_agg(r.score     order by r.score desc) from ranked r),
      (select array_agg(r.venue_id  order by r.score desc) from ranked r),
      p_ab;
  end if;
end;
$fn$;

commit;