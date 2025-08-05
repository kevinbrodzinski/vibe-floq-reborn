-- 0. prerequisites ----------------------------------------------------------
create extension if not exists pgcrypto;  -- for gen_random_uuid()

-- 1. tiny slug generator (8 chars A-Z 0-9) ----------------------------------
create or replace function public.gen_share_slug()
returns text
language sql volatile as $$
  select string_agg(
           substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                  (floor(random()*36)+1)::int, 1),
           ''
         )
  from generate_series(1,8);
$$;

-- 2. share-links table ------------------------------------------------------
create table if not exists public.afterglow_share_links (
  id                 uuid primary key default gen_random_uuid(),
  daily_afterglow_id uuid not null
      references public.daily_afterglow(id)
      on delete cascade
      on update cascade,

  slug               text    not null unique
                     default public.gen_share_slug(),  -- random 8-char slug
  og_image_url       text,                             -- filled by worker
  created_at         timestamptz default now()
);

create index if not exists afterglow_share_links_afterglow_idx
  on public.afterglow_share_links (daily_afterglow_id);

-- 3. visibility flag on parent table ---------------------------------------
alter table public.daily_afterglow
  add column if not exists is_public boolean default false;

-- 4. trigger → flip is_public on first share-link ---------------------------
create or replace function public.t_set_afterglow_public()
returns trigger
language plpgsql as $$
begin
  update public.daily_afterglow
     set is_public = true
   where id = NEW.daily_afterglow_id
     and is_public is not true;
  return NEW;
end;
$$;

drop trigger if exists trg_afterglow_set_public on public.afterglow_share_links;
create trigger trg_afterglow_set_public
after insert on public.afterglow_share_links
for each row execute procedure public.t_set_afterglow_public();

-- 5. row-level security -----------------------------------------------------
alter table public.afterglow_share_links
  enable row level security;

-- 5.1  anonymous / authenticated users can read (RLS will still run)
create policy p_share_links_public_read
  on public.afterglow_share_links
  for select using (true);

-- 5.2  owner can INSERT
create policy p_share_links_owner_insert
  on public.afterglow_share_links
  for insert
  with check (
    exists (
      select 1
        from public.daily_afterglow da
       where da.id      = NEW.daily_afterglow_id
         and da.user_id = auth.uid()
    )
  );

-- 5.3  owner can UPDATE **only** og_image_url (keep slug & FK immutable)
create policy p_share_links_owner_update_img
  on public.afterglow_share_links
  for update
  using (
    exists (
      select 1
        from public.daily_afterglow da
       where da.id      = daily_afterglow_id
         and da.user_id = auth.uid()
    )
  )
  with check (
    slug               = OLD.slug                 and
    daily_afterglow_id = OLD.daily_afterglow_id   and
    created_at         = OLD.created_at           and
    og_image_url is not null                      -- allow setting / replacing
  );

-- 6. parent table: public read, owner full ----------------------------------
alter table public.daily_afterglow enable row level security;

-- owner full access (drop existing first to avoid conflicts)
drop policy if exists p_afterglow_owner_full on public.daily_afterglow;
create policy p_afterglow_owner_full
  on public.daily_afterglow
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- anonymous can read rows explicitly marked public
drop policy if exists p_afterglow_public_read on public.daily_afterglow;
create policy p_afterglow_public_read
  on public.daily_afterglow
  for select
  using (is_public = true or user_id = auth.uid());

-- 7. privileges (roles: anon & authenticated) -------------------------------
grant select          on public.afterglow_share_links to anon, authenticated;
grant insert, update  on public.afterglow_share_links to authenticated;

grant select on public.daily_afterglow to anon;          -- RLS still applies