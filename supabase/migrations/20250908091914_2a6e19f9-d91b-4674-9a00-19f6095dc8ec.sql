-- ======================================================================
-- A) Update fn_ai_suggest_venues: add "open-now" tie-breaker (no PostGIS)
--    Inputs: numeric price level (1..4). Uses venue_hours in UTC.
-- ======================================================================

CREATE OR REPLACE FUNCTION public.fn_ai_suggest_venues(
  p_lat               double precision,
  p_lng               double precision,
  p_radius_m          integer        DEFAULT 2000,
  p_max_price_level   integer        DEFAULT 3,     -- 1..4
  p_categories        text[]         DEFAULT NULL,
  p_group_size        integer        DEFAULT 4,
  p_when              timestamptz    DEFAULT now(),
  p_limit             integer        DEFAULT 24
)
RETURNS TABLE (
  id           uuid,
  name         text,
  photo_url    text,
  lat          double precision,
  lng          double precision,
  vibe_score   numeric,
  price_level  integer,
  trend_score  numeric,
  dist_m       integer,
  score        numeric,
  reasons      text[]
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $fn$
  WITH params AS (
    SELECT
      p_lat   AS lat,
      p_lng   AS lng,
      GREATEST(100, LEAST(5000, p_radius_m)) AS radius_m,
      LEAST(4, GREATEST(1, p_max_price_level)) AS max_price,
      NULLIF(p_categories, ARRAY[]::text[]) AS categories,
      LEAST(200, GREATEST(1, p_limit)) AS lim,
      EXTRACT(DOW  FROM p_when AT TIME ZONE 'UTC')::int AS dow_utc,
      (p_when AT TIME ZONE 'UTC')::time                   AS tm_utc
  ),
  bbox AS (
    SELECT
      lat, lng, radius_m,
      (radius_m / 111000.0)::double precision AS d_lat,
      (radius_m / (111000.0 * COS(radians(lat))))::double precision AS d_lng
    FROM params
  ),
  pool AS (
    SELECT
      v.id, v.name, v.photo_url, v.lat, v.lng,
      v.vibe_score, v.price_level,
      COALESCE(tv.trend_score::numeric, v.popularity::numeric, 0) AS trend_score,
      v.categories
    FROM public.venues v
    LEFT JOIN public.v_trending_venues_enriched tv
      ON tv.venue_id = v.id
    WHERE v.lat BETWEEN ((SELECT lat - d_lat FROM bbox)) AND ((SELECT lat + d_lat FROM bbox))
      AND v.lng BETWEEN ((SELECT lng - d_lng FROM bbox)) AND ((SELECT lng + d_lng FROM bbox))
      AND (v.price_level IS NULL OR v.price_level <= (SELECT max_price FROM params))
      AND ( (SELECT categories FROM params) IS NULL OR v.categories && (SELECT categories FROM params) )
  ),
  open_now AS (
    -- True if v is open at p_when (UTC); handles overnight ranges
    SELECT
      p.id,
      EXISTS (
        SELECT 1
        FROM public.venue_hours h
        WHERE h.venue_id = p.id
          AND h.dow = (SELECT dow_utc FROM params)
          AND (
            (h.open <= h.close AND (SELECT tm_utc FROM params) >= h.open AND (SELECT tm_utc FROM params) < h.close)
            OR
            (h.open >  h.close AND ((SELECT tm_utc FROM params) >= h.open OR (SELECT tm_utc FROM params) < h.close))
          )
      ) AS is_open
    FROM pool p
  ),
  dist_scored AS (
    SELECT
      p.*,
      -- Haversine (meters), pure SQL
      (2 * 6371000.0 * asin( sqrt(
         power( sin( radians(p.lat - (SELECT lat FROM params)) / 2 ), 2 ) +
         cos( radians((SELECT lat FROM params)) ) *
         cos( radians(p.lat) ) *
         power( sin( radians(p.lng - (SELECT lng FROM params)) / 2 ), 2 )
      )) )::int AS dist_m,
      o.is_open
    FROM pool p
    LEFT JOIN open_now o ON o.id = p.id
  ),
  filtered AS (
    SELECT * FROM dist_scored
    WHERE dist_m <= (SELECT radius_m FROM params)
  ),
  scored AS (
    SELECT
      f.*,
      LEAST(1.0, GREATEST(0, dist_m::numeric / (SELECT radius_m FROM params))) AS dist_norm,
      LEAST(1.0, GREATEST(0, trend_score) / 100.0)                             AS trend_norm,
      GREATEST(0.0, COALESCE(price_level,2) - (SELECT max_price FROM params)) * 0.6 AS price_penalty,
      (
        0.45 * (1 - LEAST(1.0, GREATEST(0, dist_m::numeric / (SELECT radius_m FROM params))))
        + 0.35 * LEAST(1.0, GREATEST(0, trend_score) / 100.0)
        + 0.20 * (1 - GREATEST(0.0, COALESCE(price_level,2) - (SELECT max_price FROM params)) * 0.6)
        + CASE WHEN f.is_open THEN 0.05 ELSE 0 END   -- small open-now boost
      )::numeric AS score
    FROM filtered f
  )
  SELECT
    id, name, photo_url, lat, lng, vibe_score, price_level, trend_score, dist_m, score,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN trend_score >= 70 THEN 'Hot right now' END,
      CASE WHEN dist_m <= 600    THEN 'Nearby' END,
      CASE WHEN is_open          THEN 'Open now' END,
      CASE WHEN price_level IS NULL OR price_level <= (SELECT max_price FROM params) THEN 'Fits budget' END
    ]::text[], NULL) AS reasons
  FROM scored
  ORDER BY score DESC, dist_m ASC NULLS LAST, id ASC
  LIMIT (SELECT lim FROM params);
$fn$;

-- ======================================================================
-- B) fn_suggest_subgroups: SQL-only subgroup suggestion (SECURITY INVOKER)
--    Affinity terms: RSVP, likes overlap, co-plans (creator scope), 
--    proximity (coarse home zone vs primary venue), time-compat (±1h).
--    Returns two suggested groups with cohesion and reasons.
-- ======================================================================

CREATE OR REPLACE FUNCTION public.fn_suggest_subgroups(
  p_plan_id uuid,
  p_min_members int DEFAULT 4,
  p_coplan_days int DEFAULT 180,
  p_home_days  int DEFAULT 180,
  p_time_days  int DEFAULT 90
)
RETURNS TABLE (
  group_label text,
  members uuid[],
  cohesion float8,
  reasons text[]
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $fn$
  WITH plan_row AS (
    SELECT id, creator_id, planned_at
    FROM public.floq_plans
    WHERE id = p_plan_id
  ),
  parts AS (
    SELECT profile_id
    FROM public.plan_participants
    WHERE plan_id = p_plan_id AND profile_id IS NOT NULL
  ),
  enough AS (
    SELECT COUNT(*) AS n FROM parts
  ),
  -- Likes in this plan (swipe_right)
  likes AS (
    SELECT profile_id, (metadata->>'venue_id')::uuid AS venue_id
    FROM public.plan_activities
    WHERE plan_id = p_plan_id
      AND activity_type = 'vote_cast'
      AND metadata ? 'action'
      AND metadata->>'action' = 'swipe_right'
      AND (metadata->>'venue_id') IS NOT NULL
  ),
  -- Co-plans under same creator in last p_coplan_days (RLS applies)
  coplans AS (
    SELECT pp.profile_id, pp.plan_id
    FROM public.plan_participants pp
    JOIN public.floq_plans fp ON fp.id = pp.plan_id
    JOIN plan_row pr ON pr.creator_id = fp.creator_id
    WHERE fp.planned_at >= (now() - make_interval(days => p_coplan_days))
      AND pp.profile_id IN (SELECT profile_id FROM parts)
  ),
  -- Coarse home zone: mode geohash5 from venue_visits last p_home_days
  visits AS (
    SELECT vv.profile_id, vv.venue_id
    FROM public.venue_visits vv
    WHERE vv.profile_id IN (SELECT profile_id FROM parts)
      AND vv.arrived_at >= (now() - make_interval(days => p_home_days))
  ),
  home_cells AS (
    SELECT v.profile_id, ve.geohash5, COUNT(*) AS c
    FROM visits v
    JOIN public.venues ve ON ve.id = v.venue_id
    WHERE ve.geohash5 IS NOT NULL
    GROUP BY v.profile_id, ve.geohash5
  ),
  home_mode AS (
    SELECT DISTINCT ON (profile_id)
      profile_id, geohash5
    FROM home_cells
    ORDER BY profile_id, c DESC, geohash5
  ),
  home_centers AS (
    SELECT hm.profile_id,
           AVG(ve.lat)::double precision AS lat,
           AVG(ve.lng)::double precision AS lng
    FROM home_mode hm
    JOIN public.venues ve ON ve.geohash5 = hm.geohash5
    GROUP BY hm.profile_id
  ),
  -- Primary venue: current_stop → venue; fallback: nearest top trending (optional)
  primary_venue AS (
    SELECT
      COALESCE(ve.lat, NULL)::double precision AS lat,
      COALESCE(ve.lng, NULL)::double precision AS lng
    FROM plan_row pr
    LEFT JOIN public.plan_stops ps ON ps.id = (SELECT current_stop_id FROM public.floq_plans WHERE id = pr.id)
    LEFT JOIN public.venues ve ON ve.id = ps.venue_id
    LIMIT 1
  ),
  -- Time histograms (per hour UTC) last p_time_days
  visits_time AS (
    SELECT vv.profile_id, date_part('hour', vv.arrived_at AT TIME ZONE 'UTC')::int AS hr
    FROM public.venue_visits vv
    WHERE vv.profile_id IN (SELECT profile_id FROM parts)
      AND vv.arrived_at >= (now() - make_interval(days => p_time_days))
  ),
  hour_hist AS (
    SELECT profile_id, hr, COUNT(*) AS c
    FROM visits_time
    GROUP BY profile_id, hr
  ),
  planned_hr AS (
    SELECT (date_part('hour', pr.planned_at AT TIME ZONE 'UTC')::int) AS h
    FROM plan_row pr
  ),
  -- Pairwise participants
  ppl AS (SELECT profile_id FROM parts),
  pairs AS (
    SELECT a.profile_id AS a, b.profile_id AS b
    FROM ppl a
    JOIN ppl b ON b.profile_id > a.profile_id
  ),
  rsvp AS (
    SELECT profile_id, rsvp_status
    FROM public.plan_participants
    WHERE plan_id = p_plan_id AND profile_id IS NOT NULL
  ),
  -- RSVP weights
  pair_rsvp AS (
    SELECT
      p.a, p.b,
      CASE WHEN ra.rsvp_status='accepted' AND rb.rsvp_status='accepted' THEN 0.40
           WHEN ra.rsvp_status='maybe'    AND rb.rsvp_status='maybe'    THEN 0.20
           WHEN (ra.rsvp_status='declined') <> (rb.rsvp_status='declined') THEN -0.20
           ELSE 0 END AS w_rsvp
    FROM pairs p
    LEFT JOIN rsvp ra ON ra.profile_id = p.a
    LEFT JOIN rsvp rb ON rb.profile_id = p.b
  ),
  -- Likes overlap weight (up to 0.20)
  like_overlap AS (
    SELECT
      p.a, p.b,
      LEAST(0.20,
        0.10 + 0.10 * LEAST(3,
          COALESCE((
            SELECT COUNT(*) FROM (
              SELECT l1.venue_id
              FROM likes l1
              WHERE l1.profile_id = p.a
              INTERSECT
              SELECT l2.venue_id
              FROM likes l2
              WHERE l2.profile_id = p.b
            ) q
          ), 0)
        ) / 3.0
      ) AS w_like
    FROM pairs p
  ),
  -- Co-plan overlap weight (up to 0.30)
  coplan_overlap AS (
    SELECT
      p.a, p.b,
      CASE
        WHEN LEAST(sa.cnt, sb.cnt) = 0 THEN 0
        ELSE
          0.30 * (
            COALESCE((
              SELECT COUNT(*) FROM (
                SELECT plan_id FROM coplans WHERE profile_id = p.a
                INTERSECT
                SELECT plan_id FROM coplans WHERE profile_id = p.b
              ) x
            ), 0)::numeric
            / LEAST(sa.cnt, sb.cnt)
          )
      END AS w_coplan
    FROM pairs p
    LEFT JOIN (
      SELECT profile_id, COUNT(*) AS cnt FROM coplans GROUP BY profile_id
    ) sa ON sa.profile_id = p.a
    LEFT JOIN (
      SELECT profile_id, COUNT(*) AS cnt FROM coplans GROUP BY profile_id
    ) sb ON sb.profile_id = p.b
  ),
  -- Proximity weight (up to 0.25): closeness of (home→primary) distances
  prox AS (
    SELECT
      p.a, p.b,
      CASE
        WHEN pv.lat IS NULL OR pv.lng IS NULL
             OR ha.lat IS NULL OR ha.lng IS NULL
             OR hb.lat IS NULL OR hb.lng IS NULL
        THEN 0
        ELSE (
          -- distances to primary (meters)
          -- dA, dB → diff; closeness = 1 - min(1, diff/6000)
          -- +0.05 near-bonus if min(dA,dB) < 2500
          0.25 * (
            1 - LEAST(1.0,
              ABS(
                (2 * 6371000.0 * asin( sqrt(
                   power( sin( radians(pv.lat - ha.lat) / 2 ), 2 ) +
                   cos( radians(ha.lat) ) * cos( radians(pv.lat) ) *
                   power( sin( radians(pv.lng - ha.lng) / 2 ), 2 )
                )) )
                -
                (2 * 6371000.0 * asin( sqrt(
                   power( sin( radians(pv.lat - hb.lat) / 2 ), 2 ) +
                   cos( radians(hb.lat) ) * cos( radians(pv.lat) ) *
                   power( sin( radians(pv.lng - hb.lng) / 2 ), 2 )
                )) )
              ) / 6000.0
            )
          )
          +
          CASE WHEN LEAST(
            (2 * 6371000.0 * asin( sqrt(
               power( sin( radians(pv.lat - ha.lat) / 2 ), 2 ) +
               cos( radians(ha.lat) ) * cos( radians(pv.lat) ) *
               power( sin( radians(pv.lng - ha.lng) / 2 ), 2 )
            )) ),
            (2 * 6371000.0 * asin( sqrt(
               power( sin( radians(pv.lat - hb.lat) / 2 ), 2 ) +
               cos( radians(hb.lat) ) * cos( radians(pv.lat) ) *
               power( sin( radians(pv.lng - hb.lng) / 2 ), 2 )
            )) )
          ) < 2500 THEN 0.05 ELSE 0 END
        )
      END AS w_prox
    FROM pairs p
    LEFT JOIN primary_venue pv ON TRUE
    LEFT JOIN home_centers ha ON ha.profile_id = p.a
    LEFT JOIN home_centers hb ON hb.profile_id = p.b
  ),
  -- Time-compat (up to 0.25): min(norm activity within planned hour ±1)
  timec AS (
    SELECT
      p.a, p.b,
      0.25 * LEAST(
        COALESCE((
          SELECT (COALESCE(h1.c1,0)::numeric / NULLIF(h1.m1,0))
          FROM (
            SELECT
              SUM(CASE WHEN hr IN ( (SELECT h-1 FROM planned_hr), (SELECT h FROM planned_hr), (SELECT h+1 FROM planned_hr) ) THEN c ELSE 0 END) AS c1,
              GREATEST(1, MAX(c)) AS m1
            FROM hour_hist WHERE profile_id = p.a
          ) h1
        ), 0),
        COALESCE((
          SELECT (COALESCE(h2.c2,0)::numeric / NULLIF(h2.m2,0))
          FROM (
            SELECT
              SUM(CASE WHEN hr IN ( (SELECT h-1 FROM planned_hr), (SELECT h FROM planned_hr), (SELECT h+1 FROM planned_hr) ) THEN c ELSE 0 END) AS c2,
              GREATEST(1, MAX(c)) AS m2
            FROM hour_hist WHERE profile_id = p.b
          ) h2
        ), 0)
      ) AS w_time
    FROM pairs p
  ),
  -- Sum weights
  wsum AS (
    SELECT
      p.a, p.b,
      COALESCE(pr.w_rsvp,0) + COALESCE(lo.w_like,0) + COALESCE(co.w_coplan,0)
      + COALESCE(px.w_prox,0) + COALESCE(tc.w_time,0) AS w
    FROM pairs p
    LEFT JOIN pair_rsvp     pr ON pr.a = p.a AND pr.b = p.b
    LEFT JOIN like_overlap  lo ON lo.a = p.a AND lo.b = p.b
    LEFT JOIN coplan_overlap co ON co.a = p.a AND co.b = p.b
    LEFT JOIN prox          px ON px.a = p.a AND px.b = p.b
    LEFT JOIN timec         tc ON tc.a = p.a AND tc.b = p.b
  ),
  -- Seeds: pair with lowest affinity
  seed AS (
    SELECT a, b
    FROM wsum
    ORDER BY w ASC, a, b
    LIMIT 1
  ),
  -- One-shot assignment: sum affinity to each seed, assign to greater sum
  assign AS (
    SELECT
      u.profile_id,
      CASE
        WHEN u.profile_id IN (SELECT a FROM seed) THEN 'A'
        WHEN u.profile_id IN (SELECT b FROM seed) THEN 'B'
        ELSE
          CASE
            WHEN COALESCE( (SELECT SUM(w) FROM wsum WHERE a = u.profile_id AND b = (SELECT a FROM seed))
                         + (SELECT SUM(w) FROM wsum WHERE b = u.profile_id AND a = (SELECT a FROM seed)), 0)
               >=
                 COALESCE( (SELECT SUM(w) FROM wsum WHERE a = u.profile_id AND b = (SELECT b FROM seed))
                         + (SELECT SUM(w) FROM wsum WHERE b = u.profile_id AND a = (SELECT b FROM seed)), 0)
            THEN 'A' ELSE 'B'
          END
      END AS grp
    FROM parts u
  ),
  groups AS (
    SELECT
      grp,
      ARRAY_AGG(profile_id ORDER BY profile_id) AS members
    FROM assign
    GROUP BY grp
  ),
  cohesion AS (
    SELECT
      g.grp,
      CASE
        WHEN cardinality(g.members) <= 1 THEN 0::float8
        ELSE (
          SELECT COALESCE(AVG(w)::float8,0)
          FROM wsum
          WHERE (a = ANY (g.members) AND b = ANY (g.members))
        )
      END AS coh
    FROM groups g
  ),
  reason_list AS (
    SELECT ARRAY_REMOVE(ARRAY[
      'RSVP alignment grouped',
      (SELECT CASE WHEN EXISTS (SELECT 1 FROM likes) THEN 'Similar venue likes grouped' END),
      (SELECT CASE WHEN EXISTS (SELECT 1 FROM coplans) THEN 'Prior co-plans considered (creator scope)' END),
      (SELECT CASE WHEN EXISTS (SELECT 1 FROM home_centers) AND (SELECT lat FROM primary_venue) IS NOT NULL
              THEN 'Home-to-venue proximity considered' END),
      (SELECT CASE WHEN EXISTS (SELECT 1 FROM hour_hist) THEN 'Time-of-day compatibility considered' END)
    ]::text[], NULL) AS reasons
  )
  -- Short-circuit: return single group if not enough members
  SELECT
    'Group A'::text AS group_label,
    ARRAY_AGG(profile_id ORDER BY profile_id)::uuid[] AS members,
    1.0::float8 AS cohesion,
    (SELECT reasons FROM reason_list)
  FROM parts, enough
  WHERE (SELECT n FROM enough) < p_min_members

  UNION ALL

  -- Otherwise return two groups (A and B)
  SELECT
    CASE WHEN g.grp='A' THEN 'Group A' ELSE 'Group B' END AS group_label,
    g.members::uuid[],
    c.coh::float8,
    (SELECT reasons FROM reason_list)
  FROM groups g
  JOIN cohesion c ON c.grp = g.grp
  WHERE (SELECT n FROM enough) >= p_min_members
  ORDER BY group_label;