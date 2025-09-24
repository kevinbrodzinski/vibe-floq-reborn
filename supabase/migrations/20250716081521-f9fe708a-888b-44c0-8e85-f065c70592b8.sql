-- 1. util: tiny slug generator (8 [A-Z0-9]) ---------------------------------
create or replace function public.gen_share_slug()
returns text language sql as $$
  select string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                           (floor(random()*36)+1)::int, 1), '')
  from generate_series(1,8);
$$;

-- 2. table ------------------------------------------------------------------
create table public.afterglow_share_links (
  id                 uuid primary key default gen_random_uuid(),
  daily_afterglow_id uuid not null
      references public.daily_afterglow(id)
      on delete cascade
      on update cascade,

  -- slug generated once, immutable thereafter
  slug text unique not null
        generated always as ( public.gen_share_slug() ) stored,

  og_image_url       text,                -- nullable until first render
  created_at         timestamptz default now()
);

create index if not exists afterglow_share_links_afterglow_idx
  on public.afterglow_share_links (daily_afterglow_id);

-- 3. visibility flag on parent table ---------------------------------------
alter table public.daily_afterglow
  add column if not exists is_public boolean default false;

-- 4. trigger: set is_public when first share link row is inserted ----------

create or replace function public.t_set_afterglow_public()
returns trigger language plpgsql as $$
begin
  update public.daily_afterglow
     set is_public = true
   where id = new.daily_afterglow_id
     and is_public = false;
  return null; -- plain statement trigger
end;
$$;

create constraint trigger trg_afterglow_set_public
after insert on public.afterglow_share_links
for each row execute procedure public.t_set_afterglow_public();

-- 5. RLS hardening ----------------------------------------------------------
-- 5.1 revoke open perms
revoke all on public.afterglow_share_links from public;

-- 5.2 enable RLS
alter table public.afterglow_share_links enable row level security;

-- 5.3 anyone (even anon) can SELECT
create policy p_share_links_public_read
  on public.afterglow_share_links
  for select
  using (true);

-- 5.4 owner CREATE (and delete, if you want)
create policy p_share_links_owner_insert
  on public.afterglow_share_links
  for insert
  with check (
      exists (
        select 1 from public.daily_afterglow da
        where da.id = new.daily_afterglow_id
          and da.user_id = auth.uid()
      )
  );

-- 5.5 owner can update ONLY og_image_url (slug immutable)
create policy p_share_links_owner_update_img
  on public.afterglow_share_links
  for update
  using (exists (
           select 1 from public.daily_afterglow da
           where da.id = daily_afterglow_id
             and da.user_id = auth.uid()
         ))
  with check (slug = old.slug);   -- cannot change slug, others ok

-- 6. Parent table RLS tweak -------------------------------------------------
--   keep existing owner-full policy, just add public read
--   (only rows explicitly marked public by the trigger are visible)
alter table public.daily_afterglow enable row level security;

create policy p_afterglow_public_read
  on public.daily_afterglow
  for select
  using (is_public = true or user_id = auth.uid());