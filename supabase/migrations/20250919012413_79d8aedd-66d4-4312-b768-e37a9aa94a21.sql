-- Update floqs_card_view with energy clamping (simplified without floq_id references)
CREATE OR REPLACE VIEW floqs_card_view AS
WITH base AS (
  SELECT
    f.id,
    COALESCE(NULLIF(f.name,''), f.title) AS name,
    NULLIF(f.description,'') AS description,
    LOWER(f.visibility) AS visibility,
    LOWER(f.flock_type::text) AS flock_type,
    LOWER(f.primary_vibe::text) AS primary_vibe,
    f.title AS raw_title,
    f.starts_at,
    f.ends_at,
    f.activity_score::numeric AS activity_score,
    f.last_activity_at,
    f.created_at
  FROM public.floqs f
  WHERE f.deleted_at IS NULL
),
kind AS (
  SELECT
    b.id,
    CASE
      WHEN b.flock_type = 'momentary' THEN 'momentary'
      WHEN b.visibility = 'public' THEN 'club'
      ELSE 'friend'
    END::text AS kind
  FROM base b
),
members AS (
  SELECT fp.floq_id, COUNT(*)::int AS member_count
  FROM public.floq_participants fp
  GROUP BY fp.floq_id
),
active_now AS (
  SELECT fp.floq_id, COUNT(*)::int AS active_now
  FROM public.floq_participants fp
  WHERE EXISTS (
    SELECT 1 FROM user_online_status uos 
    WHERE uos.profile_id = fp.profile_id 
    AND (uos.is_online = TRUE OR uos.last_seen > (now() - interval '5 minutes'))
  )
  GROUP BY fp.floq_id
),
recent_msgs AS (
  SELECT fm.floq_id,
         MAX(fm.created_at) AS last_activity_at,
         SUM(CASE
               WHEN fm.created_at > now() - interval '1 hour' THEN 3
               WHEN fm.created_at > now() - interval '6 hour' THEN 2
               WHEN fm.created_at > now() - interval '24 hour' THEN 1
               ELSE 0 END)::int AS activity_score
  FROM floq_messages fm
  WHERE fm.created_at > now() - interval '7 days'
  GROUP BY fm.floq_id
),
energy_raw AS (
  SELECT b.id AS floq_id,
         LEAST(1.0, GREATEST(0.0,
           COALESCE(b.activity_score,0)/10.0 + COALESCE(rm.activity_score,0)/12.0
         )) AS raw_energy
  FROM base b
  LEFT JOIN recent_msgs rm ON rm.floq_id = b.id
),
-- upcoming plan (for RSVP)
next_plan AS (
  SELECT DISTINCT ON (fp.floq_id)
    fp.floq_id,
    fp.id AS next_plan_id,
    fp.title AS next_label,
    fp.planned_at AS starts_at
  FROM floq_plans fp
  WHERE fp.planned_at > now()
    AND fp.archived_at IS NULL
  ORDER BY fp.floq_id, fp.planned_at ASC
),
next_when AS (
  SELECT floq_id,
         CASE
           WHEN date_trunc('day', starts_at) = date_trunc('day', now()) THEN 'Today ' || to_char(starts_at, 'HH:MIam')
           WHEN date_trunc('day', starts_at) = date_trunc('day', now() + interval '1 day') THEN 'Tomorrow ' || to_char(starts_at, 'HH:MIam')
           WHEN starts_at < now() + interval '7 days' THEN to_char(starts_at, 'Dy HH:MIam')
           ELSE to_char(starts_at, 'Mon DD')
         END AS next_when
  FROM next_plan
),
-- live locations in last 20 minutes
member_locs AS (
  SELECT DISTINCT ON (fp.profile_id) fp.floq_id, vn.profile_id, vn.location
  FROM floq_participants fp
  JOIN vibes_now vn ON vn.profile_id = fp.profile_id
  WHERE vn.updated_at > now() - interval '20 minutes'
),
centroids AS (
  SELECT floq_id, ST_Centroid(ST_Collect(location))::geography AS cg
  FROM member_locs
  GROUP BY floq_id
),
convergence AS (
  SELECT ml.floq_id,
         COUNT(*)::int AS converging_nearby,
         CASE WHEN COUNT(*) > 1 THEN '≈500m' ELSE NULL END AS distance_label
  FROM member_locs ml
  JOIN centroids c ON c.floq_id = ml.floq_id
  WHERE ST_DWithin(ml.location, c.cg, 500)
  GROUP BY ml.floq_id
),
-- RALLY: via rally invites only (simplified)
rally_by_invites AS (
  SELECT fp.floq_id,
         BOOL_OR(r.status = 'active') AS rally_now,
         BOOL_OR(r.status = 'forming') AS forming
  FROM rallies r
  JOIN rally_invites ri ON ri.rally_id = r.id
  JOIN floq_participants fp ON fp.profile_id = ri.to_profile
  WHERE r.created_at > now() - interval '24 hours'
  GROUP BY fp.floq_id
),
status_bucket AS (
  SELECT
    b.id AS floq_id,
    CASE
      WHEN ri.rally_now THEN 'now'
      WHEN np.starts_at IS NOT NULL AND np.starts_at < (now() + interval '12 hour') THEN 'today'
      WHEN np.starts_at IS NOT NULL AND np.starts_at < (now() + interval '7 day') THEN 'upcoming'
      ELSE 'dormant'
    END::text AS status_bucket
  FROM base b
  LEFT JOIN next_plan np ON np.floq_id = b.id
  LEFT JOIN rally_by_invites ri ON ri.floq_id = b.id
)
SELECT
  b.id,
  b.name,
  b.description,
  k.kind,
  b.primary_vibe,
  COALESCE(m.member_count, 0) AS member_count,
  COALESCE(an.active_now, 0) AS active_now,
  COALESCE(c.converging_nearby, 0) AS converging_nearby,
  c.distance_label,
  -- Clamp energy for rally states so UI never contradicts status
  CASE
    WHEN ri.rally_now THEN GREATEST(0.70, COALESCE(er.raw_energy, 0))
    WHEN ri.forming THEN GREATEST(0.50, COALESCE(er.raw_energy, 0))
    ELSE COALESCE(er.raw_energy, 0)
  END AS energy,
  np.next_plan_id,
  np.next_label,
  nw.next_when,
  COALESCE(ri.rally_now, FALSE) AS rally_now,
  COALESCE(ri.forming, FALSE) AS forming,
  sb.status_bucket,
  NULL::boolean AS following,
  NULL::int AS streak_weeks,
  CASE
    WHEN b.last_activity_at IS NULL THEN NULL
    WHEN b.last_activity_at > now() - interval '60 sec' THEN 'just now'
    WHEN b.last_activity_at > now() - interval '60 min' THEN (EXTRACT(MINUTE FROM (now()-b.last_activity_at))::int || ' min ago')
    WHEN b.last_activity_at > now() - interval '24 hour' THEN (EXTRACT(HOUR FROM (now()-b.last_activity_at))::int || ' hours ago')
    ELSE (EXTRACT(DAY FROM (now()-b.last_activity_at))::int || ' days ago')
  END AS last_active_ago,
  CASE
    WHEN b.flock_type = 'momentary'
         AND b.ends_at IS NOT NULL
         AND b.ends_at > now()
    THEN GREATEST(0, LEAST(3600, EXTRACT(EPOCH FROM (b.ends_at - now()))))::int
    ELSE NULL
  END AS ttl_seconds,
  NULL::numeric AS match_pct
FROM base b
LEFT JOIN kind k ON k.id = b.id
LEFT JOIN members m ON m.floq_id = b.id
LEFT JOIN active_now an ON an.floq_id = b.id
LEFT JOIN energy_raw er ON er.floq_id = b.id
LEFT JOIN convergence c ON c.floq_id = b.id
LEFT JOIN next_plan np ON np.floq_id = b.id
LEFT JOIN next_when nw ON nw.floq_id = b.id
LEFT JOIN rally_by_invites ri ON ri.floq_id = b.id
LEFT JOIN status_bucket sb ON sb.floq_id = b.id;