-- Update fn_compute_friction with parameterized weights and deterministic ordering
CREATE OR REPLACE FUNCTION public.fn_compute_friction(
  p_plan_id uuid,
  p_paths_json jsonb,
  p_budget_per_person numeric DEFAULT NULL,
  p_w_coord numeric DEFAULT 0.30,
  p_w_logi  numeric DEFAULT 0.40,
  p_w_soc   numeric DEFAULT 0.15,
  p_w_fin   numeric DEFAULT 0.15
)
RETURNS TABLE (
  path_id text,
  label text,
  meters integer,
  coordination numeric,
  logistics numeric,
  social numeric,
  financial numeric,
  friction numeric,
  friction_score_pct integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
  WITH
  -- Clamp inputs lightly
  input AS (
    SELECT
      p_plan_id           AS plan_id,
      p_paths_json        AS paths_json,
      NULLIF(p_budget_per_person, 0)::numeric AS budget
  ),
  -- RSVP mix for "coordination" = 1 - ((yes + 0.5*maybe) / total)
  rsvp AS (
    SELECT
      SUM(CASE WHEN rsvp_status = 'attending' THEN 1 ELSE 0 END)::int AS c_yes,
      SUM(CASE WHEN rsvp_status = 'maybe'    THEN 1 ELSE 0 END)::int AS c_maybe,
      SUM(CASE WHEN rsvp_status = 'not_attending' THEN 1 ELSE 0 END)::int AS c_declined,
      SUM(CASE WHEN rsvp_status IS NULL OR rsvp_status IN ('pending') THEN 1 ELSE 0 END)::int AS c_pending
    FROM public.plan_participants
    WHERE plan_id = (SELECT plan_id FROM input)
  ),
  coord AS (
    SELECT
      1 - ((c_yes + 0.5 * c_maybe) / NULLIF((c_yes + c_maybe + c_declined + c_pending), 0)) AS coordination
    FROM rsvp
  ),
  -- Parse paths: each stop is ordered using WITH ORDINALITY
  paths AS (
    SELECT
      p.elem ->> 'id'    AS path_id,
      p.elem ->> 'label' AS label,
      s.ord::int         AS ord,
      (s.elem ->> 'venue_id')::uuid                         AS venue_id,
      NULLIF((s.elem ->> 'lat')::double precision, NULL)    AS lat_json,
      NULLIF((s.elem ->> 'lng')::double precision, NULL)    AS lng_json
    FROM input i,
         LATERAL jsonb_array_elements(i.paths_json) WITH ORDINALITY AS p(elem, pord),
         LATERAL jsonb_array_elements(p.elem -> 'stops') WITH ORDINALITY AS s(elem, ord)
  ),
  -- Fill missing coordinates from venues when not provided
  stops AS (
    SELECT
      x.path_id,
      COALESCE(NULLIF(x.label, ''), x.path_id) AS label,
      x.ord,
      x.venue_id,
      COALESCE(x.lat_json, v.lat)::double precision AS lat,
      COALESCE(x.lng_json, v.lng)::double precision AS lng,
      COALESCE(v.price_level, 2) AS price_level
    FROM paths x
    LEFT JOIN public.venues v ON v.id = x.venue_id
  ),
  -- Distance pairs (sum haversine across consecutive stops)
  pairs AS (
    SELECT
      a.path_id,
      a.label,
      a.ord,
      a.lat AS lat1, a.lng AS lng1,
      b.lat AS lat2, b.lng AS lng2
    FROM stops a
    JOIN stops b
      ON b.path_id = a.path_id
     AND b.ord = a.ord + 1
  ),
  meters_by_path AS (
    SELECT
      path_id,
      label,
      -- Haversine (meters)
      SUM(
        2 * 6371000.0 * asin( sqrt(
          power( sin( radians(lat2 - lat1) / 2 ), 2 ) +
          cos( radians(lat1) ) * cos( radians(lat2) ) *
          power( sin( radians(lng2 - lng1) / 2 ), 2 )
        ))
      )::int AS meters
    FROM pairs
    GROUP BY path_id, label
  ),
  -- Average price for the path (price_level 1..4 → 30 per level)
  avg_price AS (
    SELECT
      path_id,
      AVG((price_level)::numeric * 30.0) AS avg_cost
    FROM stops
    GROUP BY path_id
  ),
  -- Compose per-path factors
  factors AS (
    SELECT
      m.path_id,
      m.label,
      COALESCE(m.meters, 0) AS meters,
      (SELECT coordination FROM coord) AS coordination,
      LEAST(1.0, GREATEST(0.0, (COALESCE(m.meters,0) - 800.0) / NULLIF(6000.0 - 800.0, 0))) AS logistics,
      -- Social = min(1, 0.15 + 0.5 * (maybe+pending)/total)
      (
        SELECT
          LEAST(1.0,
            0.15 + 0.5 * (
              (c_maybe + c_pending)::numeric /
              NULLIF((c_yes + c_maybe + c_declined + c_pending), 0)
            )
          )
        FROM rsvp
      ) AS social,
      -- Financial penalty
      CASE
        WHEN (SELECT budget FROM input) IS NULL OR (SELECT budget FROM input) <= 0 THEN 0.0
        ELSE
          LEAST(1.0,
            GREATEST(0.0,
              (COALESCE(a.avg_cost, 0) - (SELECT budget FROM input)) /
              GREATEST(20.0, (SELECT budget FROM input))
            )
          )
      END AS financial
    FROM meters_by_path m
    LEFT JOIN avg_price a ON a.path_id = m.path_id
  ),
  scored AS (
    SELECT
      f.path_id,
      f.label,
      f.meters,
      f.coordination,
      f.logistics,
      f.social,
      f.financial,
      -- friction = p_w_coord*coord + p_w_logi*logistics + p_w_soc*social + p_w_fin*financial
      (p_w_coord*f.coordination + p_w_logi*f.logistics + p_w_soc*f.social + p_w_fin*f.financial) AS friction
    FROM factors f
  )
  SELECT
    path_id,
    label,
    meters,
    ROUND(coordination::numeric, 6) AS coordination,
    ROUND(logistics::numeric, 6)    AS logistics,
    ROUND(social::numeric, 6)       AS social,
    ROUND(financial::numeric, 6)    AS financial,
    ROUND(friction::numeric, 6)     AS friction,
    CAST(ROUND(100 * friction)::int AS integer) AS friction_score_pct
  FROM scored
  ORDER BY friction ASC, meters ASC, path_id ASC;

$fn$;