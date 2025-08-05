/*───────────────────────────────────────────────────────────────────────────
  0. EXTENSIONS  (safe / idempotent)
───────────────────────────────────────────────────────────────────────────*/
create extension if not exists pgcrypto  with schema extensions;   -- gen_random_uuid()
create extension if not exists citext    with schema extensions;   -- case-insensitive text

/*───────────────────────────────────────────────────────────────────────────
  1. START TRANSACTION
───────────────────────────────────────────────────────────────────────────*/
begin;

/*───────────────────────────────────────────────────────────────────────────
  2.  DROP objects that block the column-type change
      •  profiles_username_lowercase_trigger
      •  view  v_friends_with_profile
      (we cache the view's SQL so we can re-create it later)
───────────────────────────────────────────────────────────────────────────*/
do $$
declare
    vdef text;
begin
    /* 2A - drop the lowercase trigger if it exists */
    if exists (
        select 1 from pg_trigger
        where tgname = 'profiles_username_lowercase_trigger'
          and tgrelid = 'public.profiles'::regclass
    ) then
        execute 'drop trigger profiles_username_lowercase_trigger on public.profiles';
    end if;

    /* 2B - capture & drop the dependent view (if present) */
    if exists (
        select 1
        from pg_class
        where oid = 'public.v_friends_with_profile'::regclass
    ) then
        select pg_get_viewdef('public.v_friends_with_profile'::regclass, true)
          into vdef;
        execute 'drop view public.v_friends_with_profile';
        create temporary table if not exists _tmp_viewdef (v text);
        truncate _tmp_viewdef;
        insert into _tmp_viewdef values (vdef);
    end if;
end$$;

/*───────────────────────────────────────────────────────────────────────────
  3.  PROFILES TABLE  (ensure exists & username = CITEXT)
───────────────────────────────────────────────────────────────────────────*/
create table if not exists public.profiles (
    id           uuid        primary key references auth.users(id) on delete cascade,
    email        text        unique,
    username     citext      unique,
    display_name text,
    avatar_url   text,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

alter table public.profiles
    alter column username type citext using username::citext;

create unique index if not exists profiles_username_unique
    on public.profiles(username);

/*───────────────────────────────────────────────────────────────────────────
  4.  RLS  (owner-only)
───────────────────────────────────────────────────────────────────────────*/
alter table public.profiles enable row level security;

drop policy if exists profiles_select_owner  on public.profiles;
drop policy if exists profiles_update_owner on public.profiles;

create policy profiles_select_owner
    on public.profiles
    for select
    using (id = auth.uid());

create policy profiles_update_owner
    on public.profiles
    for update
    using (id = auth.uid())
    with check (id = auth.uid());

/*───────────────────────────────────────────────────────────────────────────
  5.  LOWERCASE-ENFORCER trigger    (re-create after the type change)
───────────────────────────────────────────────────────────────────────────*/
create or replace function public.ensure_username_lowercase()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT'
       or new.username is distinct from old.username then
        new.username := lower(new.username::text)::citext;
    end if;
    return new;
end;
$$;

create trigger profiles_username_lowercase_trigger
before insert or update on public.profiles
for each row
execute function public.ensure_username_lowercase();

/*───────────────────────────────────────────────────────────────────────────
  6.  AUTO-PROFILE function + trigger   (handles new sign-ups)
───────────────────────────────────────────────────────────────────────────*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
    base      text;
    candidate text;
    n         int := 0;
begin
    /* Derive a base handle from email */
    base := lower(regexp_replace(split_part(new.email, '@', 1),
                                 '[^a-z0-9_]', '', 'g'));
    if base is null or base = '' then
        base := 'user';
    end if;

    /* Find a unique username (max 5 collisions, then UUID postfix) */
    loop
        candidate := base || case when n = 0 then '' else n::text end;
        exit
        when not exists (select 1 from public.profiles where username = candidate);
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
  7.  LEGACY BACK-FILL  (profiles for existing users w/out one)
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
  8.  RE-CREATE the friends-with-profile view (if it existed)
───────────────────────────────────────────────────────────────────────────*/
do $$
declare
    vdef text;
begin
    if exists (select 1
               from pg_tables
               where schemaname = 'pg_temp'
                 and tablename  = '_tmp_viewdef') then
        select v into vdef from _tmp_viewdef limit 1;
        execute 'create or replace view public.v_friends_with_profile as ' || vdef;
        drop table _tmp_viewdef;
    end if;
end$$;

/*───────────────────────────────────────────────────────────────────────────
  9.  COMMIT
───────────────────────────────────────────────────────────────────────────*/
commit;