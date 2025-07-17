create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
strict stable                -- new
as $$
begin
  return  length(trim(p_username)) > 0
      and not exists (
        select 1
        from profiles
        where lower(username) = lower(trim(p_username))
      );
end;
$$;