-- 1️⃣ exactly one row per geohash6 (≈ 1 km²)
create table if not exists public.weather_cache (
  geohash6   text primary key,
  fetched_at timestamptz not null default now(),
  payload    jsonb       not null
);

-- 2️⃣ tiny index so we can expire rows quickly
create index if not exists idx_weather_cache_expiry
  on public.weather_cache(fetched_at);

-- 3️⃣ (optional) nightly cleanup – keep last 24 h
create or replace function public.trim_weather_cache()
returns void
language sql
as $$
  delete from public.weather_cache
  where fetched_at < now() - interval '24 hours';
$$;