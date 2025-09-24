-- 2025-08-12_db_assisted_dedupe.sql
begin;

-- Extensions
create extension if not exists postgis;
create extension if not exists pg_trgm;

-- Alias map: cross-provider IDs -> canonical venue
create table if not exists public.venue_aliases (
  venue_id   uuid not null references public.venues(id) on delete cascade,
  provider   text not null,
  provider_id text not null,
  created_at timestamptz not null default now(),
  primary key (provider, provider_id)
);
create index if not exists idx_venue_aliases_venue_id on public.venue_aliases(venue_id);

-- Speed up fuzzy lookup
create index if not exists idx_venues_name_trgm on public.venues using gin (lower(name) gin_trgm_ops);
create index if not exists idx_venues_addr_trgm on public.venues using gin (lower(coalesce(address,'')) gin_trgm_ops);

-- Text normalizer (keep it simple & robust)
create or replace function public._norm_text(s text)
returns text language sql immutable as $$
  select trim(regexp_replace(regexp_replace(lower(coalesce(s,'')), '[^a-z0-9\s]', ' ', 'g'), '\s+', ' ', 'g'));
$$;

-- Find likely duplicate within radius by name/address similarity + distance
create or replace function public.find_duplicate_venue(
  p_name text,
  p_lat double precision,
  p_lng double precision,
  p_address text default null,
  p_radius_m int default 80,
  p_name_sim numeric default 0.64,
  p_addr_sim numeric default 0.58
)
returns table(
  venue_id uuid,
  dist_m int,
  name_sim numeric,
  addr_sim numeric
) language plpgsql stable as $$
declare
  pt geography := st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography;
  nn text := public._norm_text(p_name);
  na text := public._norm_text(p_address);
begin
  return query
  with cand as (
    select
      v.id,
      cast(st_distance(v.geom::geography, pt) as int) as dist_m,
      similarity(public._norm_text(v.name), nn) as name_sim,
      similarity(public._norm_text(v.address), na) as addr_sim
    from public.venues v
    where v.geom is not null
      and st_dwithin(v.geom::geography, pt, p_radius_m)
  )
  select id, dist_m, name_sim, addr_sim
  from cand
  where name_sim >= p_name_sim
     or (p_address is not null and addr_sim >= p_addr_sim)
  order by greatest(name_sim, addr_sim) desc, dist_m asc
  limit 1;
end$$;

-- Merge helper: union arrays (tags/cuisines/categories)
create or replace function public._array_union(a anyarray, b anyarray)
returns anyarray language sql immutable as $$
  select coalesce(array(select distinct x from unnest(coalesce(a,'{}'::anyarray) || coalesce(b,'{}'::anyarray)) as t(x)), '{}');
$$;

-- Upsert with DB dedupe + field-quality merge + alias mapping
create or replace function public.upsert_merge_venue(p jsonb)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  dup record;
  j jsonb := p;
  v_provider text := j->>'provider';
  v_provider_id text := j->>'provider_id';
  v_name text := j->>'name';
  v_lat double precision := (j->>'lat')::double precision;
  v_lng double precision := (j->>'lng')::double precision;
  v_addr text := j->>'address';
begin
  if v_provider is null or v_provider_id is null then
    raise exception 'provider and provider_id required';
  end if;

  -- 1) Exact alias hit?
  select venue_id into v_id
  from public.venue_aliases
  where provider = v_provider and provider_id = v_provider_id;
  if v_id is not null then
    -- Update with "fill empty / keep better" rules
    update public.venues v set
      address      = coalesce(v.address, j->>'address'),
      categories   = public._array_union(v.categories,   coalesce(array(select jsonb_array_elements_text(j->'categories')), '{}')),
      price_tier   = coalesce(v.price_tier, nullif(j->>'price_level','')::text::public.price_enum),
      rating       = coalesce(v.rating, nullif(j->>'rating','')::numeric),
      popularity   = greatest(coalesce(v.popularity,0), coalesce(nullif(j->>'rating_count','')::int,0)),
      photo_url    = coalesce(v.photo_url, j->>'photo_url'),
      description  = coalesce(v.description, j->>'description'),
      lat          = coalesce(v.lat, v_lat),
      lng          = coalesce(v.lng, v_lng),
      geom         = coalesce(v.geom, st_setsrid(st_makepoint(v_lng, v_lat),4326)),
      updated_at   = now()
    where v.id = v_id;
    return v_id;
  end if;

  -- 2) Fuzzy duplicate lookup (trigram + geo)
  select * into dup
  from public.find_duplicate_venue(v_name, v_lat, v_lng, v_addr, 80, 0.64, 0.58);

  if dup.venue_id is not null then
    v_id := dup.venue_id;

    -- Merge into existing
    update public.venues v set
      address      = coalesce(v.address, j->>'address'),
      categories   = public._array_union(v.categories,   coalesce(array(select jsonb_array_elements_text(j->'categories')), '{}')),
      price_tier   = coalesce(v.price_tier, nullif(j->>'price_level','')::text::public.price_enum),
      rating       = coalesce(v.rating, nullif(j->>'rating','')::numeric),
      popularity   = greatest(coalesce(v.popularity,0), coalesce(nullif(j->>'rating_count','')::int,0)),
      photo_url    = coalesce(v.photo_url, j->>'photo_url'),
      description  = coalesce(v.description, j->>'description'),
      updated_at   = now()
    where v.id = v_id;

    -- Record alias
    insert into public.venue_aliases(venue_id, provider, provider_id)
    values (v_id, v_provider, v_provider_id)
    on conflict (provider, provider_id) do nothing;

    return v_id;
  end if;

  -- 3) No dup -> insert new canonical venue
  insert into public.venues(
    name, lat, lng, provider, provider_id, address, categories,
    price_tier, rating, popularity, photo_url, description, updated_at, geom
  )
  values(
    v_name, v_lat, v_lng, v_provider, v_provider_id, v_addr,
    coalesce(array(select jsonb_array_elements_text(j->'categories')), '{}'),
    nullif(j->>'price_level','')::text::public.price_enum,
    nullif(j->>'rating','')::numeric,
    nullif(j->>'rating_count','')::int,
    j->>'photo_url',
    j->>'description',
    now(),
    st_setsrid(st_makepoint(v_lng, v_lat),4326)
  )
  returning id into v_id;

  insert into public.venue_aliases(venue_id, provider, provider_id)
  values (v_id, v_provider, v_provider_id)
  on conflict (provider, provider_id) do nothing;

  return v_id;
end$$;

-- (Optional) simple RPC to set embedding later if you want to add vector matching
create or replace function public.set_venue_embedding(p_venue_id uuid, p_emb float4[])
returns void language sql as $$
  update public.venues set embedding = p_emb::vector where id = p_venue_id;
$$;

-- Add missing columns to venues table if they don't exist
do $$
begin
  -- Add hours column for open-now functionality
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'hours'
  ) then
    alter table public.venues add column hours jsonb;
  end if;

  -- Add popularity_hourly for busy-now functionality
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'popularity_hourly'
  ) then
    alter table public.venues add column popularity_hourly int[];
  end if;

  -- Add rating_count for better merge logic
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'rating_count'
  ) then
    alter table public.venues add column rating_count int;
  end if;

  -- Add tags for vibe matching
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'tags'
  ) then
    alter table public.venues add column tags text[] default '{}';
  end if;

  -- Add cuisines for cuisine matching
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'cuisines'
  ) then
    alter table public.venues add column cuisines text[] default '{}';
  end if;

  -- Add price_level as int for compatibility
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'price_level'
  ) then
    alter table public.venues add column price_level int;
  end if;

  -- Add embedding column for vector similarity
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'embedding'
  ) then
    alter table public.venues add column embedding vector(1536);
  end if;

  -- Add last_seen for sync tracking
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'venues' and column_name = 'last_seen'
  ) then
    alter table public.venues add column last_seen timestamptz default now();
  end if;
end$$;

-- Additional indexes for performance
create index if not exists idx_venues_tags on public.venues using gin(tags);
create index if not exists idx_venues_cuisines on public.venues using gin(cuisines);
create index if not exists idx_venues_embedding on public.venues using ivfflat (embedding vector_cosine_ops) with (lists=100);
create index if not exists idx_venues_last_seen on public.venues(last_seen);
create index if not exists idx_venues_rating_count on public.venues(rating_count) where rating_count is not null;

-- RLS: aliases are read-only
alter table public.venue_aliases enable row level security;
create policy if not exists "read aliases" on public.venue_aliases for select using (true);

commit;