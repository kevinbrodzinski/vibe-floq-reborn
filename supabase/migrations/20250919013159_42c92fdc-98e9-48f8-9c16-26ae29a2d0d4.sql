-- Add optional brand_avatar_url column to floqs table
ALTER TABLE public.floqs
  ADD COLUMN IF NOT EXISTS brand_avatar_url text;

-- Recreate floqs_card_view with avatar_url support
DROP VIEW IF EXISTS floqs_card_view CASCADE;

CREATE VIEW floqs_card_view AS
WITH base AS (
  SELECT
    f.id,
    f.creator_id,                                  -- bring creator for avatar lookup
    f.brand_avatar_url,                            -- optional floq-specific avatar
    COALESCE(NULLIF(f.name,''), f.title) AS name,
    NULLIF(f.description,'')   AS description,
    LOWER(f.visibility)        AS visibility,
    LOWER(f.flock_type::text)  AS flock_type,
    LOWER(f.primary_vibe::text)AS primary_vibe,
    f.title                    AS raw_title,
    f.starts_at,
    f.ends_at,
    f.activity_score::numeric  AS activity_score,
    f.last_activity_at,
    f.created_at
  FROM public.floqs f
  WHERE f.deleted_at IS NULL
),
kind AS (
  SELECT b.id, b.flock_type,
    CASE WHEN b.flock_type='momentary' THEN 'momentary'
         WHEN b.visibility='public'    THEN 'club'
         ELSE 'friend' END::text AS kind
  FROM base b
),
members AS (
  SELECT
    b.id AS floq_id,
    COUNT(fp.profile_id)::int AS member_count
  FROM base b
  LEFT JOIN floq_participants fp ON fp.floq_id = b.id
  GROUP BY b.id
),
active_now AS (
  SELECT
    b.id AS floq_id,
    COUNT(DISTINCT vn.profile_id)::int AS active_now
  FROM base b
  LEFT JOIN vibes_now vn ON vn.profile_id IN (
    SELECT fp.profile_id FROM floq_participants fp WHERE fp.floq_id = b.id
  )
  WHERE vn.created_at > now() - interval '30 minutes'
  GROUP BY b.id
),
recent_msgs AS (
  SELECT
    b.id AS floq_id,
    COUNT(fm.id)::int AS recent_msg_count
  FROM base b
  LEFT JOIN floq_messages fm ON fm.floq_id = b.id 
    AND fm.created_at > now() - interval '2 hours'
  GROUP BY b.id
),
energy_raw AS (
  SELECT
    b.id AS floq_id,
    GREATEST(0.0, LEAST(1.0, 
      COALESCE(b.activity_score, 0.0) * 0.4 + 
      COALESCE(an.active_now, 0)::numeric / GREATEST(COALESCE(m.member_count, 1), 1) * 0.3 +
      CASE WHEN rm.recent_msg_count > 0 THEN 0.3 ELSE 0.0 END
    )) AS raw_energy
  FROM base b
  LEFT JOIN members m ON m.floq_id = b.id
  LEFT JOIN active_now an ON an.floq_id = b.id
  LEFT JOIN recent_msgs rm ON rm.floq_id = b.id
),
next_plan AS (
  SELECT DISTINCT ON (b.id)
    b.id AS floq_id,
    fp.id AS next_plan_id,
    fp.title AS next_label
  FROM base b
  LEFT JOIN floq_plans fp ON fp.floq_id = b.id
    AND fp.starts_at > now()
    AND fp.status IN ('draft', 'confirmed')
  ORDER BY b.id, fp.starts_at ASC
),
next_when AS (
  SELECT
    np.floq_id,
    CASE
      WHEN fp.starts_at IS NULL THEN NULL
      WHEN fp.starts_at::date = CURRENT_DATE THEN 'Today'
      WHEN fp.starts_at::date = CURRENT_DATE + 1 THEN 'Tomorrow'
      ELSE TO_CHAR(fp.starts_at, 'Mon DD')
    END AS next_when
  FROM next_plan np
  LEFT JOIN floq_plans fp ON fp.id = np.next_plan_id
),
member_locs AS (
  SELECT
    b.id AS floq_id,
    ARRAY_AGG(ST_X(vn.location::geometry)) FILTER (WHERE vn.location IS NOT NULL) AS member_lngs,
    ARRAY_AGG(ST_Y(vn.location::geometry)) FILTER (WHERE vn.location IS NOT NULL) AS member_lats
  FROM base b
  LEFT JOIN floq_participants fp ON fp.floq_id = b.id
  LEFT JOIN vibes_now vn ON vn.profile_id = fp.profile_id
    AND vn.created_at > now() - interval '30 minutes'
  GROUP BY b.id
),
centroids AS (
  SELECT
    ml.floq_id,
    CASE 
      WHEN array_length(ml.member_lngs, 1) > 0 THEN
        (SELECT AVG(unnest) FROM unnest(ml.member_lngs))
      ELSE NULL
    END AS center_lng,
    CASE 
      WHEN array_length(ml.member_lats, 1) > 0 THEN
        (SELECT AVG(unnest) FROM unnest(ml.member_lats))
      ELSE NULL
    END AS center_lat
  FROM member_locs ml
),
convergence AS (
  SELECT
    c.floq_id,
    0 AS converging_nearby,
    NULL::text AS distance_label
  FROM centroids c
),
rally_direct AS (
  SELECT DISTINCT
    b.id AS floq_id,
    r.id AS rally_id,
    r.status AS rally_status,
    r.created_at AS rally_created_at
  FROM base b
  INNER JOIN rallies r ON r.floq_id = b.id
  WHERE r.status IN ('active', 'forming')
    AND r.expires_at > now()
),
rally_by_invites AS (
  SELECT DISTINCT
    b.id AS floq_id,
    r.id AS rally_id,
    r.status AS rally_status,
    r.created_at AS rally_created_at
  FROM base b
  INNER JOIN floq_participants fp ON fp.floq_id = b.id
  INNER JOIN rally_invites ri ON ri.invitee_id = fp.profile_id
  INNER JOIN rallies r ON r.id = ri.rally_id
  WHERE r.status IN ('active', 'forming')
    AND r.expires_at > now()
),
rally AS (
  SELECT
    COALESCE(rd.floq_id, rbi.floq_id) AS floq_id,
    CASE WHEN COALESCE(rd.rally_status, rbi.rally_status) = 'active' THEN true ELSE false END AS rally_now,
    CASE WHEN COALESCE(rd.rally_status, rbi.rally_status) = 'forming' THEN true ELSE false END AS forming
  FROM rally_direct rd
  FULL OUTER JOIN rally_by_invites rbi ON rd.floq_id = rbi.floq_id
),
status_bucket AS (
  SELECT
    b.id AS floq_id,
    CASE
      WHEN COALESCE(r.rally_now, false) THEN 'now'
      WHEN COALESCE(r.forming, false) OR COALESCE(an.active_now, 0) > 0 THEN 'today'
      WHEN np.next_plan_id IS NOT NULL THEN 'upcoming'
      ELSE 'dormant'
    END::text AS status_bucket
  FROM base b
  LEFT JOIN rally r ON r.floq_id = b.id
  LEFT JOIN active_now an ON an.floq_id = b.id
  LEFT JOIN next_plan np ON np.floq_id = b.id
)
SELECT
  b.id,
  b.name,
  b.description,
  k.kind,
  b.primary_vibe,
  COALESCE(m.member_count, 0)                          AS member_count,
  COALESCE(an.active_now, 0)                           AS active_now,
  COALESCE(c.converging_nearby, 0)                     AS converging_nearby,
  c.distance_label,
  CASE
    WHEN r.rally_now THEN GREATEST(0.70, COALESCE(er.raw_energy,0))
    WHEN r.forming   THEN GREATEST(0.50, COALESCE(er.raw_energy,0))
    ELSE COALESCE(er.raw_energy, 0)
  END                                                  AS energy,
  np.next_plan_id,
  np.next_label,
  nw.next_when,
  COALESCE(r.rally_now,FALSE)                          AS rally_now,
  COALESCE(r.forming,FALSE)                            AS forming,
  sb.status_bucket,
  -- Avatar preference: floq brand → owner profile → null
  COALESCE(b.brand_avatar_url, owner.avatar_url)       AS avatar_url,
  NULL::boolean                                        AS following,
  NULL::int                                            AS streak_weeks,
  CASE
    WHEN b.last_activity_at IS NULL THEN NULL
    WHEN b.last_activity_at > now() - interval '60 sec'  THEN 'just now'
    WHEN b.last_activity_at > now() - interval '60 min'  THEN (EXTRACT(MINUTE FROM (now()-b.last_activity_at))::int || ' min ago')
    WHEN b.last_activity_at > now() - interval '24 hour' THEN (EXTRACT(HOUR FROM (now()-b.last_activity_at))::int   || ' hours ago')
    ELSE (EXTRACT(DAY FROM (now()-b.last_activity_at))::int || ' days ago')
  END                                                  AS last_active_ago,
  CASE
    WHEN b.flock_type = 'momentary' AND b.ends_at IS NOT NULL AND b.ends_at > now()
    THEN GREATEST(0, LEAST(3600, EXTRACT(EPOCH FROM (b.ends_at - now()))))::int
    ELSE NULL
  END                                                  AS ttl_seconds,
  NULL::numeric                                        AS match_pct
FROM base b
LEFT JOIN profiles owner   ON owner.id   = b.creator_id  -- Join owner for avatar
LEFT JOIN kind           k  ON k.id      = b.id
LEFT JOIN members        m  ON m.floq_id = b.id
LEFT JOIN active_now     an ON an.floq_id = b.id
LEFT JOIN energy_raw     er ON er.floq_id = b.id
LEFT JOIN convergence    c  ON c.floq_id  = b.id
LEFT JOIN next_plan      np ON np.floq_id = b.id
LEFT JOIN next_when      nw ON nw.floq_id = b.id
LEFT JOIN rally          r  ON r.floq_id  = b.id
LEFT JOIN status_bucket  sb ON sb.floq_id = b.id;