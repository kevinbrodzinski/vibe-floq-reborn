-- Add optional brand_avatar_url column to floqs table
ALTER TABLE public.floqs
  ADD COLUMN IF NOT EXISTS brand_avatar_url text;

-- Recreate floqs_card_view with avatar_url support (simplified rally logic since rallies table lacks floq_id)
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
  WHERE vn.updated_at > now() - interval '30 minutes'
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
    AND fp.planned_at > now()  -- Use planned_at instead of starts_at
    AND fp.status IN ('draft', 'active', 'finalized')
  ORDER BY b.id, fp.planned_at ASC
),
next_when AS (
  SELECT
    np.floq_id,
    CASE
      WHEN fp.planned_at IS NULL THEN NULL
      WHEN fp.planned_at::date = CURRENT_DATE THEN 'Today'
      WHEN fp.planned_at::date = CURRENT_DATE + 1 THEN 'Tomorrow'
      ELSE TO_CHAR(fp.planned_at, 'Mon DD')
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
    AND vn.updated_at > now() - interval '30 minutes'
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
status_bucket AS (
  SELECT
    b.id AS floq_id,
    CASE
      WHEN COALESCE(an.active_now, 0) > 0 THEN 'today'
      WHEN np.next_plan_id IS NOT NULL THEN 'upcoming'
      ELSE 'dormant'
    END::text AS status_bucket
  FROM base b
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
  COALESCE(er.raw_energy, 0)                           AS energy,
  np.next_plan_id,
  np.next_label,
  nw.next_when,
  FALSE                                                AS rally_now,  -- Simplified since no floq_id in rallies
  FALSE                                                AS forming,    -- Simplified since no floq_id in rallies
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
LEFT JOIN status_bucket  sb ON sb.floq_id = b.id;