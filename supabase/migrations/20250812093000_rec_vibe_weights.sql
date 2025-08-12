begin;

create table if not exists public.rec_vibe_weights (
  vibe text primary key,
  w_distance  numeric not null default 0.25,
  w_rating    numeric not null default 0.20,
  w_popularity numeric not null default 0.20,
  w_tag_match numeric not null default 0.15,
  w_cuisine_match numeric not null default 0.10,
  w_price_fit numeric not null default 0.10,
  updated_at timestamptz not null default now()
);

create table if not exists public.rec_user_vibe_weights (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vibe text not null,
  weights jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, vibe)
);

-- Seed common vibes (idempotent)
insert into public.rec_vibe_weights (vibe,w_distance,w_rating,w_popularity,w_tag_match,w_cuisine_match,w_price_fit)
values
  ('default',0.25,0.20,0.20,0.15,0.10,0.10),
  ('hype',   0.12,0.16,0.34,0.26,0.04,0.08),
  ('chill',  0.20,0.25,0.12,0.23,0.10,0.10),
  ('date',   0.15,0.30,0.12,0.28,0.05,0.10),
  ('work',   0.32,0.16,0.10,0.20,0.05,0.17)
on conflict (vibe) do update set
  w_distance=excluded.w_distance,
  w_rating=excluded.w_rating,
  w_popularity=excluded.w_popularity,
  w_tag_match=excluded.w_tag_match,
  w_cuisine_match=excluded.w_cuisine_match,
  w_price_fit=excluded.w_price_fit,
  updated_at=now();

commit;