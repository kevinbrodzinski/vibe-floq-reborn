-- Add case-insensitive username availability RPC
create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return not exists (
    select 1
    from profiles
    where lower(username) = lower(trim(p_username))
  );
end;
$$;

grant execute on function public.username_available(text) to authenticated;

-- Allow authenticated users to insert floq_plans they own
create policy "Users can create their own plans"
on public.floq_plans
for insert
with check (creator_id = auth.uid());