-- Create RPC function for thread lookup/creation
create or replace function public.get_or_create_dm_thread(
  p_user_a uuid,
  p_user_b uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread_id uuid;
begin
  -- Prevent self-messaging
  if p_user_a = p_user_b then
    raise exception 'Cannot create DM thread with yourself';
  end if;

  -- Check if users are friends
  if not public.are_friends(p_user_a, p_user_b) then
    raise exception 'Cannot create DM thread - users are not friends';
  end if;

  -- 1. ensure canonical order (matches uniq_thread_pair)
  if p_user_a > p_user_b then
    v_thread_id := p_user_a;
    p_user_a    := p_user_b;
    p_user_b    := v_thread_id;
  end if;

  -- 2. try to find existing thread
  select id into v_thread_id
  from direct_threads
  where member_a = p_user_a
    and member_b = p_user_b
  limit 1;

  -- 3. create if not found
  if v_thread_id is null then
    insert into direct_threads (
      member_a,
      member_b,
      member_a_profile_id,
      member_b_profile_id
    )
    values (p_user_a, p_user_b, p_user_a, p_user_b)
    returning id into v_thread_id;
  end if;

  return v_thread_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_or_create_dm_thread(uuid, uuid) to authenticated;