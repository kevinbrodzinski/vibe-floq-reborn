-- Drop existing function first, then create the safer version
DROP FUNCTION IF EXISTS public.username_available(text);

-- 1️⃣ & 2️⃣  Safer username availability check
create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
strict stable                 -- <-- new
as $$
begin
  return  length(trim(p_username)) > 0            -- reject blank values
      and not exists (
        select 1
          from profiles
         where lower(username) = lower(trim(p_username))
      );
end;
$$;

grant execute on function public.username_available(text) to authenticated;