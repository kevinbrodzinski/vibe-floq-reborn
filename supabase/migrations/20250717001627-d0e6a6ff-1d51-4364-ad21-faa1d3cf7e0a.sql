-- 1. make sure RLS is ON and only the owner can touch her row
alter table public.profiles enable row level security;

create policy "self-profile-access"
on public.profiles
for all
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- 2. guarantee required columns exist
alter table public.profiles
  add column if not exists username      text unique,
  add column if not exists display_name  text,
  add column if not exists avatar_url    text;

-- 3. replace the old trigger with a bullet-proof one
drop function if exists public.handle_new_user cascade;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  -- 1. derive a base username: before @, lower-cased, strip non-alnum
  base_username := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]', '', 'g');

  -- fallback for weird addresses like "+tag"
  if base_username = '' then
     base_username := 'user';
  end if;

  -- 2. find a free username ( user, user1, user2 … ) in one query
  loop
    final_username := base_username || case when suffix = 0 then '' else suffix::text end;
    exit when not exists (select 1 from public.profiles where username = final_username);
    suffix := suffix + 1;
  end loop;

  -- 3. insert the profile row
  insert into public.profiles (id, email, username, display_name, avatar_url)
  values (new.id, new.email, final_username, final_username, new.raw_user_meta_data->>'avatar_url');

  return new;
end;
$$;

-- 4. hook it up
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();