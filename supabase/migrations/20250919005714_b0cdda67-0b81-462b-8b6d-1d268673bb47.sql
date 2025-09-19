-- Extended floqs_card_view with presence + locations integration
-- This version uses existing tables and gracefully handles missing ones

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
active_now AS (
  SELECT fp.floq_id, COUNT(*)::int AS active_now
  FROM public.floq_participants fp
  JOIN user_online_status uos
    ON uos.profile_id = fp.profile_id
  WHERE uos.is_online = TRUE
     OR uos.last_seen > (now() - interval '5 minutes')
  GROUP BY fp.floq_id
),
-- TODO: Uncomment when floq_messages table exists
-- recent_msgs AS (
--   SELECT
--     fm.floq_id,
--     MAX(fm.created_at)                 AS last_activity_at,
--     SUM( CASE WHEN fm.created_at > now() - interval '1 hour'  THEN 3
--               WHEN fm.created_at > now() - interval '6 hour'  THEN 2
--               WHEN fm.created_at > now() - interval '24 hour' THEN 1
--               ELSE 0 END )::int        AS activity_score
--   FROM floq_messages fm
--   GROUP BY fm.floq_id
-- ),
energy AS (
  -- Use floqs.activity_score for now (add message-derived score later)
  SELECT
    b.id AS floq_id,
    LEAST(1.0, GREATEST(0.0, COALESCE(b.activity_score,0)/10.0)) AS energy
  FROM base b
  -- LEFT JOIN recent_msgs rm ON rm.floq_id = b.id  -- TODO: Uncomment when table exists
),
-- TODO: Uncomment when floq_rallies table exists
-- rally AS (
--   SELECT
--     fr.floq_id,
--     BOOL_OR(fr.status = 'live')    AS rally_now,
--     BOOL_OR(fr.status = 'forming') AS forming
--   FROM floq_rallies fr
--   WHERE fr.started_at > now() - interval '24 hours'
--   GROUP BY fr.floq_id
-- ),
rally_heuristic AS (
  -- Heuristic rally detection until floq_rallies table exists
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
-- TODO: Uncomment when floq_plans table exists
-- next_plan AS (
--   SELECT DISTINCT ON (fp.floq_id)
--     fp.floq_id,
--     fp.title                 AS next_label,
--     fp.starts_at,
--     fp.venue_name
--   FROM floq_plans fp
--   WHERE fp.starts_at > now()
--   ORDER BY fp.floq_id, fp.starts_at ASC
-- ),
next_plan_fallback AS (
  -- Use floq's own title/starts_at until floq_plans exists
  SELECT
    b.id AS floq_id,
    CASE
      WHEN b.starts_at IS NOT NULL AND b.starts_at > now() THEN COALESCE(NULLIF(b.raw_title,''), b.name)
      ELSE NULL
    END AS next_label,
    b.starts_at,
    NULL::text AS venue_name
  FROM base b
),
next_when AS (
  SELECT
    floq_id,
    CASE
      WHEN starts_at IS NULL THEN NULL
      WHEN date_trunc('day', starts_at) = date_trunc('day', now()) THEN
        'Today ' || to_char(starts_at, 'HH:MIam')
      WHEN date_trunc('day', starts_at) = date_trunc('day', now() + interval '1 day') THEN
        'Tomorrow ' || to_char(starts_at, 'HH:MIam')
      WHEN starts_at < now() + interval '7 days' THEN
        to_char(starts_at, 'Dy HH:MIam')
      ELSE
        to_char(starts_at, 'Mon DD')
    END AS next_when
  FROM next_plan_fallback  -- Change to next_plan when floq_plans exists
),
-- Live locations: last 20 minutes (vibes_now exists)
member_locs AS (
  SELECT DISTINCT ON (fp.profile_id)
    fp.floq_id,
    vn.profile_id,
    vn.location
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
  WHERE ST_DWithin(ml.location, c.cg, 500) -- 500 meters
  GROUP BY ml.floq_id
),
-- TODO: Uncomment when follow_floqs and streaks tables exist
-- following AS (
--   SELECT floq_id, TRUE AS following
--   FROM follow_floqs
--   WHERE profile_id = auth.uid()
--   GROUP BY floq_id
-- ),
-- streak AS (
--   SELECT floq_id, MAX(weeks)::int AS streak_weeks
--   FROM streaks
--   GROUP BY floq_id
-- ),
status_bucket AS (
  SELECT
    b.id AS floq_id,
    CASE
      WHEN r.rally_now THEN 'now'
      WHEN np.starts_at IS NOT NULL AND np.starts_at < (now() + interval '12 hour') THEN 'today'
      WHEN np.starts_at IS NOT NULL AND np.starts_at < (now() + interval '7 day')  THEN 'upcoming'
      ELSE 'dormant'
    END::text AS status_bucket
  FROM base b
  LEFT JOIN next_plan_fallback np ON np.floq_id = b.id  -- Change to next_plan when floq_plans exists
  LEFT JOIN rally_heuristic r ON r.floq_id = b.id      -- Change to rally when floq_rallies exists
)

SELECT
  b.id,
  b.name,
  b.description,
  k.kind,
  b.primary_vibe,
  COALESCE(m.member_count, 0)              AS member_count,
  COALESCE(an.active_now, 0)               AS active_now,
  COALESCE(c.converging_nearby, 0)         AS converging_nearby,
  c.distance_label,
  COALESCE(e.energy, 0.0)                  AS energy,
  np.next_label,
  nw.next_when,
  COALESCE(r.rally_now,false)              AS rally_now,
  COALESCE(r.forming,false)                AS forming,
  sb.status_bucket,
  NULL::boolean                            AS following,        -- TODO: Link f.following when follow_floqs exists
  NULL::int                                AS streak_weeks,     -- TODO: Link s.streak_weeks when streaks exists
  CASE
    WHEN COALESCE(b.last_activity_at, b.created_at) > now() - interval '60 sec'  THEN 'just now'
    WHEN COALESCE(b.last_activity_at, b.created_at) > now() - interval '60 min'  THEN (EXTRACT(MINUTE FROM (now()-COALESCE(b.last_activity_at, b.created_at)))::int || ' min ago')
    WHEN COALESCE(b.last_activity_at, b.created_at) > now() - interval '24 hour' THEN (EXTRACT(HOUR FROM (now()-COALESCE(b.last_activity_at, b.created_at)))::int   || ' hours ago')
    ELSE (EXTRACT(DAY FROM (now()-COALESCE(b.last_activity_at, b.created_at)))::int || ' days ago')
  END AS last_active_ago,
  CASE
    WHEN b.flock_type = 'momentary'
         AND b.ends_at IS NOT NULL
         AND b.ends_at > now()
      THEN GREATEST(0, LEAST(3600, EXTRACT(EPOCH FROM (b.ends_at - now()))))::int
    ELSE NULL
  END AS ttl_seconds,
  NULL::numeric                             AS match_pct
FROM base b
LEFT JOIN kind           k   ON k.id         = b.id
LEFT JOIN members        m   ON m.floq_id    = b.id
LEFT JOIN active_now     an  ON an.floq_id   = b.id
LEFT JOIN energy         e   ON e.floq_id    = b.id
LEFT JOIN convergence    c   ON c.floq_id    = b.id
LEFT JOIN next_plan_fallback np ON np.floq_id = b.id  -- Change to next_plan when floq_plans exists
LEFT JOIN next_when      nw  ON nw.floq_id   = b.id
LEFT JOIN rally_heuristic r  ON r.floq_id    = b.id  -- Change to rally when floq_rallies exists
LEFT JOIN status_bucket  sb  ON sb.floq_id   = b.id;
-- LEFT JOIN following      f   ON f.floq_id    = b.id  -- TODO: Uncomment when follow_floqs exists
-- LEFT JOIN streak         s   ON s.floq_id    = b.id  -- TODO: Uncomment when streaks exists

-- Supporting indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_uos_last_seen     ON user_online_status(last_seen DESC) WHERE last_seen IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vibes_now_updated ON vibes_now(updated_at DESC) WHERE updated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vibes_now_loc     ON vibes_now USING GIST (location) WHERE location IS NOT NULL;