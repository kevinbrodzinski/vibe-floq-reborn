-- 2025-08-12_user_model_weights.sql
begin;

alter table public.user_tastes
  add column if not exists model_weights jsonb,              -- {"w_distance":0.22,...,"bias":0.0}
  add column if not exists model_updated_at timestamptz;

-- Update the get_personalized_recs function to use per-user weights when present
create or replace function public.get_personalized_recs(
  p_profile_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 3000,
  p_now timestamptz default now(),
  p_vibe text default null,
  p_tags text[] default null,
  p_tz text default 'America/Los_Angeles',
  p_limit int default 20,
  p_ab text default null,           -- optional A/B label, logged if provided
  p_log boolean default true        -- toggle logging
)
returns table(venue_id uuid, name text, dist_m int, score numeric, reason text)
language plpgsql as $$
declare
  pt geography := st_setsrid(st_makepoint(p_lng, p_lat),4326)::geography;
begin
  return query
  with tastes as (
    select * from public.user_tastes where profile_id = p_profile_id
  ),
  -- weights: per-user model_weights -> per-user override -> vibe row -> default row
  w as (
    select
      coalesce( (ut.model_weights->>'w_distance')::numeric,   uw.weights->>'w_distance'::numeric,   vw.w_distance,  dv.w_distance)  as w_distance,
      coalesce( (ut.model_weights->>'w_rating')::numeric,     uw.weights->>'w_rating'::numeric,     vw.w_rating,    dv.w_rating)    as w_rating,
      coalesce( (ut.model_weights->>'w_popularity')::numeric, uw.weights->>'w_popularity'::numeric, vw.w_popularity,dv.w_popularity)as w_popularity,
      coalesce( (ut.model_weights->>'w_tag_match')::numeric,  uw.weights->>'w_tag_match'::numeric,  vw.w_tag_match, dv.w_tag_match) as w_tag_match,
      coalesce( (ut.model_weights->>'w_cuisine_match')::numeric, uw.weights->>'w_cuisine_match'::numeric, vw.w_cuisine_match,dv.w_cuisine_match) as w_cuisine_match,
      coalesce( (ut.model_weights->>'w_price_fit')::numeric,  uw.weights->>'w_price_fit'::numeric,  vw.w_price_fit, dv.w_price_fit) as w_price_fit,
      coalesce( (ut.model_weights->>'bias')::numeric, 0) as w_bias
    from (select * from public.rec_vibe_weights where vibe = coalesce(p_vibe,'default')) vw
    full join (select * from public.rec_vibe_weights where vibe = 'default') dv on true
    left join public.rec_user_vibe_weights uw
      on uw.vibe = coalesce(p_vibe,'default') and uw.profile_id = p_profile_id
    left join public.user_tastes ut on ut.profile_id = p_profile_id
    limit 1
  ),
  ctx as (
    select coalesce((select preferred_tags     from tastes), '{}') pref_tags,
           coalesce((select disliked_tags      from tastes), '{}') bad_tags,
           coalesce((select preferred_cuisines from tastes), '{}') pref_cuisines,
           coalesce((select disliked_cuisines  from tastes), '{}') bad_cuisines,
           coalesce((select price_min from tastes), null) pmin,
           coalesce((select price_max from tastes), null) pmax,
           coalesce((select open_now_only from tastes), true) open_only
  ),
  base as (
    select v.id, v.name,
           cast(st_distance(v.geom::geography, pt) as int) dist_m,
           v.categories, v.tags, v.cuisines, v.price_tier, v.price_level, v.rating, v.rating_count, v.popularity, v.popularity_hourly, v.hours
    from public.venues v
    where v.geom is not null
      and st_dwithin(v.geom::geography, pt, p_radius_m)
      and (p_tags is null or v.categories && p_tags or v.tags && p_tags)
  ),
  filtered as (
    select b.*
    from base b, ctx
    where (ctx.open_only is false or public.is_open_at(b.hours, p_tz, p_now))
      and (ctx.pmin is null or (b.price_tier = '$' and ctx.pmin <= 1) or 
           (b.price_tier = '$$' and ctx.pmin <= 2) or
           (b.price_tier = '$$$' and ctx.pmin <= 3) or
           (b.price_tier = '$$$$' and ctx.pmin <= 4) or
           (b.price_level is not null and b.price_level >= ctx.pmin))
      and (ctx.pmax is null or (b.price_tier = '$' and ctx.pmax >= 1) or 
           (b.price_tier = '$$' and ctx.pmax >= 2) or
           (b.price_tier = '$$$' and ctx.pmax >= 3) or
           (b.price_tier = '$$$$' and ctx.pmax >= 4) or
           (b.price_level is not null and b.price_level <= ctx.pmax))
      and not (b.categories && ctx.bad_tags or b.tags && ctx.bad_tags)
      and not (b.categories && ctx.bad_cuisines or b.cuisines && ctx.bad_cuisines)
  ),
  scored as (
    select
      f.id as venue_id,
      f.name,
      f.dist_m,
      -- components
      (1 - least(f.dist_m::numeric / greatest(p_radius_m,1), 1)) as c_distance,
      coalesce((f.rating/5.0), 0)                                as c_rating,
      coalesce(
        case when f.popularity_hourly is null then (f.popularity::numeric / 100.0)
             else (f.popularity_hourly[extract(hour from (p_now at time zone p_tz))::int + 1]::numeric
                   / greatest(nullif((select max(x) from unnest(f.popularity_hourly) x),0),1))
        end, 0)                                                  as c_popularity,
      case when p_vibe is not null and (f.categories @> array[p_vibe] or f.tags @> array[p_vibe]) then 1 else 0 end as c_tag_match,
      case when exists (select 1 from ctx where (f.categories && ctx.pref_cuisines or f.cuisines && ctx.pref_cuisines)) then 1 else 0 end as c_cuisine_match,
      case when (f.price_tier is not null or f.price_level is not null) then 1 else 0 end as c_price_fit
    from filtered f
  ),
  final as (
    select
      s.venue_id, s.name, s.dist_m,
      s.c_distance   * (select w_distance   from w) +
      s.c_rating     * (select w_rating     from w) +
      s.c_popularity * (select w_popularity from w) +
      s.c_tag_match  * (select w_tag_match  from w) +
      s.c_cuisine_match * (select w_cuisine_match from w) +
      s.c_price_fit  * (select w_price_fit  from w) +
      (select w_bias from w) as score,
      concat_ws(' · ',
        (case when p_vibe is not null and s.c_tag_match=1 then 'Matches vibe' end),
        (case when s.dist_m <= 800 then 'Walkable' end),
        (case when s.c_rating >= 0.9 then 'Top rated' end),
        (case when s.c_popularity >= 0.7 then 'Popular now' end),
        (case when s.c_price_fit=1 then 'In budget' end)
      ) as reason
    from scored s
    order by score desc, dist_m asc
    limit p_limit
  )
  select * from final;

  -- Optional logging
  if p_log then
    insert into public.recommendation_events (profile_id, context, candidate_ids, scores, top_ids, ab_bucket)
    select
      p_profile_id,
      jsonb_build_object(
        'lat', p_lat, 'lng', p_lng, 'radius_m', p_radius_m,
        'now', p_now, 'tz', p_tz, 'vibe', p_vibe, 'tags', p_tags
      ),
      (select array_agg(venue_id order by score desc) from final),
      (select array_agg(score order by score desc)    from final),
      (select array_agg(venue_id order by score desc) from final),
      p_ab;
  end if;
end;
$$;

-- Training features RPC for consistent feature computation
create or replace function public.train_user_features(
  p_profile_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m int,
  p_now timestamptz,
  p_vibe text,
  p_tags text[],
  p_tz text,
  p_candidate_ids uuid[],
  p_engage_window_min int default 90
) returns table(
  venue_id uuid,
  c_distance numeric,
  c_rating numeric,
  c_popularity numeric,
  c_tag_match numeric,
  c_cuisine_match numeric,
  c_price_fit numeric,
  engaged boolean
) language sql stable as $$
with pt as (
  select st_setsrid(st_makepoint(p_lng, p_lat),4326)::geography as g
),
tastes as (
  select *
  from public.user_tastes
  where profile_id = p_profile_id
),
ctx as (
  select coalesce((select preferred_cuisines from tastes), '{}') as pref_cuisines,
         coalesce((select price_min from tastes), null) as pmin,
         coalesce((select price_max from tastes), null) as pmax
),
base as (
  select v.*
  from public.venues v
  where v.id = any(p_candidate_ids)
),
feat as (
  select
    b.id as venue_id,
    -- same normalization as main RPC
    (1 - least(cast(st_distance(b.geom::geography, (select g from pt)) as numeric) / greatest(p_radius_m,1), 1)) as c_distance,
    coalesce((b.rating/5.0), 0) as c_rating,
    coalesce(
      case when b.popularity_hourly is null then (b.popularity::numeric / 100.0)
           else (b.popularity_hourly[extract(hour from (p_now at time zone p_tz))::int + 1]::numeric
                 / greatest(nullif((select max(x) from unnest(b.popularity_hourly) x),0),1))
      end, 0) as c_popularity,
    case when p_vibe is not null and (b.categories @> array[p_vibe] or b.tags @> array[p_vibe]) then 1 else 0 end as c_tag_match,
    case when exists (select 1 from ctx where (b.categories && ctx.pref_cuisines or b.cuisines && ctx.pref_cuisines)) then 1 else 0 end as c_cuisine_match,
    case when (b.price_tier is not null or b.price_level is not null) and exists (select 1 from ctx
          where (ctx.pmin is null or (b.price_level is not null and b.price_level >= ctx.pmin) or
                 (b.price_tier = '$' and ctx.pmin <= 1) or (b.price_tier = '$$' and ctx.pmin <= 2) or 
                 (b.price_tier = '$$$' and ctx.pmin <= 3) or (b.price_tier = '$$$$' and ctx.pmin <= 4))
            and (ctx.pmax is null or (b.price_level is not null and b.price_level <= ctx.pmax) or
                 (b.price_tier = '$' and ctx.pmax >= 1) or (b.price_tier = '$$' and ctx.pmax >= 2) or 
                 (b.price_tier = '$$$' and ctx.pmax >= 3) or (b.price_tier = '$$$$' and ctx.pmax >= 4))) then 1 else 0 end as c_price_fit
  from base b
),
lab as (
  select
    v.id as venue_id,
    exists (
      select 1 from public.venue_interactions vi
      where vi.profile_id = p_profile_id
        and vi.venue_id = v.id
        and vi.created_at between p_now and p_now + (p_engage_window_min || ' minutes')::interval
        and vi.interaction_type in ('tap','like','bookmark','checkin','plan')
    ) as engaged
  from base v
)
select f.venue_id, f.c_distance, f.c_rating, f.c_popularity, f.c_tag_match, f.c_cuisine_match, f.c_price_fit,
       l.engaged
from feat f
join lab l using (venue_id);
$$;

commit;