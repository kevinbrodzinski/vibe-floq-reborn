/*───────────────────────────────────────────────────────────────────────────
  0.  EXTENSIONS  (safe / idempotent)
───────────────────────────────────────────────────────────────────────────*/
create extension if not exists pgcrypto  with schema extensions;  -- gen_random_uuid()
create extension if not exists citext    with schema extensions;  -- case-insensitive text

/*───────────────────────────────────────────────────────────────────────────
  1.  START  TRANSACTION
───────────────────────────────────────────────────────────────────────────*/
begin;

/*───────────────────────────────────────────────────────────────────────────
  2.  CAPTURE & DROP  view that depends on profiles.username
───────────────────────────────────────────────────────────────────────────*/
do $$
declare
    vdef text;
begin
    -- Grab the current view SQL (NULL if the view doesn't exist yet)
    select pg_get_viewdef('public.v_friends_with_profile'::regclass, true)
      into vdef
      where exists (
        select 1
        from pg_class
        where oid = 'public.v_friends_with_profile'::regclass
      );

    -- Drop the view so we can alter the column type
    if vdef is not null then
        execute 'drop view public.v_friends_with_profile';
    end if;

    -- Store the definition for later recreation
    if vdef is not null then
        create temporary table _tmp_viewdef as
        select vdef;
    end if;
end$$;

/*───────────────────────────────────────────────────────────────────────────
  3.  PROFILES  table  (create if missing, ensure CITEXT)
───────────────────────────────────────────────────────────────────────────*/
create table if not exists public.profiles (
    id           uuid      primary key references auth.users(id) on delete cascade,
    email        text      unique,
    username     citext    unique,
    display_name text,
    avatar_url   text,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

-- Force column to be CITEXT even if the table pre-existed
alter table public.profiles
    alter column username type citext using username::citext;

create unique index if not exists profiles_username_unique
    on public.profiles(username);

/*───────────────────────────────────────────────────────────────────────────
  4.  RLS  (owner-only)
───────────────────────────────────────────────────────────────────────────*/
alter table public.profiles enable row level security;

drop policy if exists profiles_select_owner on public.profiles;
create policy profiles_select_owner
    on public.profiles
    for select
    using (id = auth.uid());

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner
    on public.profiles
    for update
    using (id = auth.uid())
    with check (id = auth.uid());

/*───────────────────────────────────────────────────────────────────────────
  5.  FUNCTION  + TRIGGER  (auto-create profile on signup)
───────────────────────────────────────────────────────────────────────────*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    base text;
    candidate text;
    n int := 0;
begin
    if auth.uid() is distinct from new.id then
        raise exception 'handle_new_user(): not authorised';
    end if;

    base := lower(
              regexp_replace(split_part(new.email, '@', 1),
                             '[^a-z0-9_]', '', 'g'));

    if base is null or base = '' then
        base := 'user';
    end if;

    loop
        candidate := base || case when n = 0 then '' else n::text end;
        exit when not exists (select 1 from public.profiles where username = candidate);
        n := n + 1;
        if n >= 5 then
            candidate := 'user_' || left(gen_random_uuid()::text, 8);
            exit;
        end if;
    end loop;

    insert into public.profiles (id, email, username, display_name, avatar_url)
    values (new.id,
            new.email,
            candidate,
            coalesce(new.raw_user_meta_data->>'full_name', candidate),
            new.raw_user_meta_data->>'avatar_url')
    on conflict (id) do nothing;

    return new;
end;
$$;

grant execute on function public.handle_new_user() to authenticated, anon;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

/*───────────────────────────────────────────────────────────────────────────
  6.  BACK-FILL  (create profiles for legacy users)
───────────────────────────────────────────────────────────────────────────*/
insert into public.profiles (id, email, username, display_name)
select  u.id,
        u.email,
        'user_' || left(u.id::text, 8),
        coalesce(u.raw_user_meta_data->>'full_name', u.email)
from    auth.users u
left  join public.profiles p on p.id = u.id
where   p.id is null
on conflict (id) do nothing;

/*───────────────────────────────────────────────────────────────────────────
  7.  RE-CREATE  the friends-with-profile view (if it existed)
───────────────────────────────────────────────────────────────────────────*/
do $$
declare
    vdef text;
begin
    if exists (select 1 from pg_tables where tablename = '_tmp_viewdef') then
        select vdef into vdef from _tmp_viewdef limit 1;
        execute 'create or replace view public.v_friends_with_profile as ' || vdef;
        drop table _tmp_viewdef;
    end if;
end$$;

/*───────────────────────────────────────────────────────────────────────────
  8.  COMMIT
───────────────────────────────────────────────────────────────────────────*/
commit;