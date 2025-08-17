-- 13A: v_friend_last_seen (MV)
DROP VIEW IF EXISTS public.v_friend_last_seen;
DROP MATERIALIZED VIEW IF EXISTS public.v_friend_last_seen;

CREATE MATERIALIZED VIEW public.v_friend_last_seen AS
WITH last_presence AS (
  SELECT p.profile_id, MAX(p.updated_at) AS last_seen_at
  FROM public.presence p
  GROUP BY p.profile_id
),
edges AS (
  SELECT f.profile_low  AS current_profile_id,
         f.profile_high AS other_profile_id,
         f.friend_state
  FROM public.friendships f
  WHERE f.friend_state = 'accepted'
  UNION ALL
  SELECT f.profile_high AS current_profile_id,
         f.profile_low  AS other_profile_id,
         f.friend_state
  FROM public.friendships f
  WHERE f.friend_state = 'accepted'
)
SELECT
  e.current_profile_id,
  e.other_profile_id,
  lp.last_seen_at,
  e.friend_state
FROM edges e
LEFT JOIN last_presence lp
  ON lp.profile_id = e.other_profile_id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS ix_v_friend_last_seen_pk
  ON public.v_friend_last_seen (current_profile_id, other_profile_id);

-- 13B: v_friend_sparkline (MV)
DROP VIEW IF EXISTS public.v_friend_sparkline;
DROP MATERIALIZED VIEW IF EXISTS public.v_friend_sparkline;

CREATE MATERIALIZED VIEW public.v_friend_sparkline AS
WITH edges AS (
  SELECT f.profile_low AS current_profile_id, f.profile_high AS other_profile_id
  FROM public.friendships f WHERE f.friend_state = 'accepted'
  UNION ALL
  SELECT f.profile_high AS current_profile_id, f.profile_low AS other_profile_id
  FROM public.friendships f WHERE f.friend_state = 'accepted'
),
slots AS (
  SELECT p.profile_id, p.venue_id, date_trunc('hour', p.updated_at) AS hour_ts
  FROM public.presence p
  WHERE p.venue_id IS NOT NULL
    AND p.updated_at >= (now() - interval '14 days')
  GROUP BY p.profile_id, p.venue_id, date_trunc('hour', p.updated_at)
)
SELECT e.current_profile_id,
       e.other_profile_id,
       date_trunc('day', s1.hour_ts)::date AS day,
       COUNT(*)::int AS shared_hours
FROM edges e
JOIN slots s1 ON s1.profile_id = e.current_profile_id
JOIN slots s2 ON s2.profile_id = e.other_profile_id
             AND s2.venue_id   = s1.venue_id
             AND s2.hour_ts    = s1.hour_ts
GROUP BY e.current_profile_id, e.other_profile_id, date_trunc('day', s1.hour_ts)::date
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS ix_v_friend_sparkline_pk
  ON public.v_friend_sparkline (current_profile_id, other_profile_id, day);