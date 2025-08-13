-- friends_recent_at_venue(uuid, uuid)
-- friendships(profile_a_id, profile_b_id, status='accepted')
create or replace function public.friends_recent_at_venue(p_me uuid, p_venue uuid)
returns table (id uuid, display_name text, username text, avatar_url text)
language sql stable as $$
  with f as (
    select case when profile_a_id = p_me then profile_b_id else profile_a_id end as fid
    from friendships
    where (profile_a_id = p_me or profile_b_id = p_me)
      and status = 'accepted'
  )
  select p.id, p.display_name, p.username, p.avatar_url
  from venue_visits v
  join f on f.fid = v.profile_id
  join profiles p on p.id = v.profile_id
  where v.venue_id = p_venue
    and v.created_at >= now() - interval '30 days'
  group by p.id, p.display_name, p.username, p.avatar_url
  order by max(v.created_at) desc
  limit 20;
$$;

grant execute on function public.friends_recent_at_venue(uuid,uuid) to authenticated;