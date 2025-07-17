/*───────────────────────────────────────────────────────────────────────────
  0.  EXTENSIONS (safe / idempotent)
───────────────────────────────────────────────────────────────────────────*/
create extension if not exists pgcrypto  with schema extensions;   -- gen_random_uuid()
create extension if not exists citext    with schema extensions;   -- case-insensitive text

/*───────────────────────────────────────────────────────────────────────────
  1.  PROFILES  TABLE
───────────────────────────────────────────────────────────────────────────*/
create table if not exists public.profiles (
    id           uuid      primary key references auth.users (id) on delete cascade,
    email        text      unique,
    username     citext    unique,
    display_name text,
    avatar_url   text,
    created_at   timestamptz default now(),
    updated_at   timestamptz default now()
);

-- Ensure the username column really is CITEXT even if table pre-existed
alter table public.profiles
  alter column username type citext using username::citext;

create unique index if not exists profiles_username_unique
  on public.profiles (username);

/*───────────────────────────────────────────────────────────────────────────
  2.  RLS  (owner-only read + update)
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
  3.  FUNCTION   handle_new_user()
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
    ----------------------------------------------------------------------
    -- sanity check: ensure caller is the same user — prevents abuse
    ----------------------------------------------------------------------
    if auth.uid() is distinct from new.id then
        raise exception 'handle_new_user(): not authorised';
    end if;

    base := lower(
              regexp_replace(split_part(new.email, '@', 1),
                             '[^a-z0-9_]',
                             '',
                             'g')
            );

    if base is null or base = '' then
        base := 'user';
    end if;

    -- try up to 5 collisions, then fallback to uuid slice
    loop
        candidate := base || case when n = 0 then '' else n::text end;
        exit when not exists (select 1 from public.profiles where username = candidate);
        n := n + 1;
        if n >= 5 then
            candidate := 'user_' || left(gen_random_uuid()::text, 8);
            exit;
        end if;
    end loop;

    insert into public.profiles (
        id,
        email,
        username,
        display_name,
        avatar_url
    )
    values (
        new.id,
        new.email,
        candidate,
        coalesce(new.raw_user_meta_data->>'full_name', candidate),
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

grant execute on function public.handle_new_user() to authenticated, anon;

/*───────────────────────────────────────────────────────────────────────────
  4.  TRIGGER  on auth.users
───────────────────────────────────────────────────────────────────────────*/
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

/*───────────────────────────────────────────────────────────────────────────
  5.  BACK-FILL  (for users created before this trigger existed)
───────────────────────────────────────────────────────────────────────────*/
insert into public.profiles (id, email, username, display_name)
select  u.id,
        u.email,
        'user_' || left(u.id::text, 8),
        coalesce(u.raw_user_meta_data->>'full_name', u.email)
from    auth.users u
left join public.profiles p on p.id = u.id
where   p.id is null
on conflict (id) do nothing;