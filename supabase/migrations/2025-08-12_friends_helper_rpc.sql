-- friends_of helper RPC for better friend discovery
-- 2025-08-12_friends_helper_rpc.sql

begin;

-- Helper function to get friend IDs for a given user
-- Returns a set of UUIDs representing the profile_ids of accepted friends
create or replace function public.friends_of(p_uid uuid)
returns setof uuid
language sql stable
security definer
set search_path = public
as $$
  -- Try friendships table first (bidirectional relationship)
  select case 
    when f.profile_id_a = p_uid then f.profile_id_b 
    else f.profile_id_a 
  end
  from public.friendships f
  where (f.profile_id_a = p_uid or f.profile_id_b = p_uid)
    and f.status = 'accepted'
  
  union
  
  -- Fallback to friends table (unidirectional relationship)
  select fr.friend_id
  from public.friends fr
  where fr.profile_id = p_uid
    and fr.state = 'accepted'
$$;

comment on function public.friends_of(uuid) is 
  'Returns friend profile_ids for a given user. Handles both bidirectional friendships and unidirectional friends tables.';

-- Grant execute to authenticated users
grant execute on function public.friends_of(uuid) to authenticated;

commit;