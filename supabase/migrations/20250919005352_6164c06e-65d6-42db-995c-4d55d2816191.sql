-- Create floqs_card_view - comprehensive view for Living Floq Cards
DROP VIEW IF EXISTS floqs_card_view CASCADE;

CREATE VIEW floqs_card_view AS
WITH base AS (
  SELECT
    f.id,
    COALESCE(NULLIF(f.name,''), f.title)              AS name,
    NULLIF(f.description,'')                          AS description,
    LOWER(f.visibility)                               AS visibility,
    LOWER(f.flock_type::text)                         AS flock_type,
    LOWER(f.primary_vibe::text)                       AS primary_vibe,
    f.title                                           AS raw_title,
    f.starts_at,
    f.ends_at,
    f.activity_score::numeric                         AS activity_score,
    f.last_activity_at,
    f.created_at
  FROM public.floqs f
  WHERE f.deleted_at IS NULL
),
kind AS (
  -- Heuristic: public+persistent => club; momentary => momentary; otherwise friend
  SELECT
    b.id,
    CASE
      WHEN b.flock_type = 'momentary' THEN 'momentary'
      WHEN b.visibility = 'public'    THEN 'club'
      ELSE 'friend'
    END::text AS kind
  FROM base b
),
members AS (
  SELECT fp.floq_id, COUNT(*)::int AS member_count
  FROM public.floq_participants fp
  GROUP BY fp.floq_id
),
energy AS (
  -- normalize floqs.activity_score (>=0) to 0..1 (tune divisor when you have real distribution)
  SELECT id AS floq_id,
         LEAST(1.0, GREATEST(0.0, activity_score / 10.0)) AS energy
  FROM base
),
next_plan AS (
  -- use the floq's title as the "next" label when it hasn't started yet
  SELECT
    b.id AS floq_id,
    CASE
      WHEN b.starts_at IS NOT NULL AND b.starts_at > now() THEN COALESCE(NULLIF(b.raw_title,''), b.name)
      ELSE NULL
    END AS next_label,
    b.starts_at
  FROM base b
),
next_when AS (
  SELECT
    np.floq_id,
    CASE
      WHEN np.next_label IS NULL OR np.starts_at IS NULL THEN NULL
      WHEN date_trunc('day', np.starts_at) = date_trunc('day', now()) THEN
        'Today ' || to_char(np.starts_at, 'HH:MIam')
      WHEN date_trunc('day', np.starts_at) = date_trunc('day', now() + interval '1 day') THEN
        'Tomorrow ' || to_char(np.starts_at, 'HH:MIam')
      WHEN np.starts_at < now() + interval '7 days' THEN
        to_char(np.starts_at, 'Dy HH:MIam')
      ELSE
        to_char(np.starts_at, 'Mon DD')
    END AS next_when
  FROM next_plan np
),
rally_state AS (
  -- minimal derivation:
  -- rally_now  : we are inside the floq window (for momentary) or ends_at > now() AND starts_at <= now()
  -- forming    : starts within next 2 hours
  SELECT
    b.id AS floq_id,
    CASE
      WHEN b.flock_type = 'momentary' AND b.starts_at <= now() AND (b.ends_at IS NULL OR b.ends_at > now()) THEN TRUE
      WHEN b.starts_at IS NOT NULL AND b.starts_at <= now() AND (b.ends_at IS NULL OR b.ends_at > now()) THEN TRUE
      ELSE FALSE
    END AS rally_now,
    CASE
      WHEN b.starts_at IS NOT NULL AND b.starts_at > now() AND b.starts_at <= now() + interval '2 hour' THEN TRUE
      ELSE FALSE
    END AS forming
  FROM base b
),
status_bucket AS (
  SELECT
    b.id AS floq_id,
    CASE
      WHEN rs.rally_now THEN 'now'
      WHEN np.starts_at IS NOT NULL AND np.starts_at < (now() + interval '12 hour') THEN 'today'
      WHEN np.starts_at IS NOT NULL AND np.starts_at < (now() + interval '7 day')  THEN 'upcoming'
      ELSE 'dormant'
    END::text AS status_bucket
  FROM base b
  LEFT JOIN next_plan   np ON np.floq_id = b.id
  LEFT JOIN rally_state rs ON rs.floq_id = b.id
)

SELECT
  b.id,
  b.name,
  b.description,
  k.kind,
  b.primary_vibe,
  COALESCE(m.member_count, 0)            AS member_count,
  0::int                                 AS active_now,
  NULL::int                              AS converging_nearby,
  NULL::text                             AS distance_label,
  COALESCE(e.energy, 0.0)                AS energy,
  np.next_label,
  nw.next_when,
  rs.rally_now,
  rs.forming,
  sb.status_bucket,
  NULL::boolean                          AS following,
  NULL::int                              AS streak_weeks,
  CASE
    WHEN b.last_activity_at IS NULL THEN NULL
    WHEN b.last_activity_at > now() - interval '60 sec'
      THEN 'just now'
    WHEN b.last_activity_at > now() - interval '60 min'
      THEN (EXTRACT(MINUTE FROM (now()-b.last_activity_at))::int || ' min ago')
    WHEN b.last_activity_at > now() - interval '24 hour'
      THEN (EXTRACT(HOUR FROM (now()-b.last_activity_at))::int   || ' hours ago')
    ELSE (EXTRACT(DAY FROM (now()-b.last_activity_at))::int      || ' days ago')
  END AS last_active_ago,
  CASE
    WHEN b.flock_type = 'momentary'
         AND b.ends_at IS NOT NULL
         AND b.ends_at > now()
         THEN GREATEST(0, LEAST(3600, EXTRACT(EPOCH FROM (b.ends_at - now()))))::int
    ELSE NULL
  END AS ttl_seconds,
  NULL::numeric                          AS match_pct
FROM base b
LEFT JOIN kind          k  ON k.id  = b.id
LEFT JOIN members       m  ON m.floq_id = b.id
LEFT JOIN energy        e  ON e.floq_id = b.id
LEFT JOIN next_plan     np ON np.floq_id = b.id
LEFT JOIN next_when     nw ON nw.floq_id = b.id
LEFT JOIN rally_state   rs ON rs.floq_id = b.id
LEFT JOIN status_bucket sb ON sb.floq_id = b.id;