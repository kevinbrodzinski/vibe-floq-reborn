-- Fixture generator for afterglow testing
create or replace function test.seed_afterglow(p_user uuid)
returns void language plpgsql as $$
begin
  -- midnight-crossing session: 22:00-03:00 local
  insert into public.afterglow_moments(user_id, started_at, energy, social_intensity)
  values
    (p_user, (now() - interval '6 hours'), 60, 40),   -- 22:00
    (p_user, (now() - interval '5 hours'), 75, 50),   -- 23:00
    (p_user, (now() - interval '3 hours'), 80, 30);   -- 01:00
  -- a next-day morning entry to verify cut-off
  insert into public.afterglow_moments(user_id, started_at, energy, social_intensity)
  values (p_user, (now() - interval '1 hours'), 20, 10); -- 05:00
end; $$;