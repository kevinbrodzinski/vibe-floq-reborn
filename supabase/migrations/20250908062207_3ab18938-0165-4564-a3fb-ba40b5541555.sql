-- Fix JSONB operators and recreate function with float8 return types
DROP FUNCTION IF EXISTS public.fn_compute_friction CASCADE;

CREATE OR REPLACE FUNCTION public.fn_compute_friction(
  p_plan_id uuid,
  p_paths_json jsonb,
  p_budget_per_person numeric DEFAULT NULL,
  p_w_coord numeric DEFAULT 0.30,
  p_w_logi  numeric DEFAULT 0.40,
  p_w_soc   numeric DEFAULT 0.15,
  p_w_fin   numeric DEFAULT 0.15
) RETURNS TABLE (
  path_id text,
  label text,
  meters int,
  coordination float8,
  logistics float8,
  social float8,
  financial float8,
  friction float8,
  friction_score_pct int
) LANGUAGE sql STABLE AS $fn$
  WITH path_data AS (
    SELECT 
      (path_elem->>'id')::text AS path_id,
      COALESCE((path_elem->>'label')::text, 'Path') AS label,
      path_elem->'stops' AS stops_json
    FROM jsonb_array_elements(p_paths_json) AS path_elem
  ),
  stop_coords AS (
    SELECT 
      pd.path_id,
      pd.label,
      stop_elem->>'venue_id' AS venue_id,
      ROW_NUMBER() OVER (PARTITION BY pd.path_id ORDER BY ordinality) AS stop_order
    FROM path_data pd,
         jsonb_array_elements(pd.stops_json) WITH ORDINALITY AS stop_elem
  ),
  venue_coords AS (
    SELECT sc.path_id, sc.stop_order, sc.venue_id, v.lat, v.lng
    FROM stop_coords sc
    LEFT JOIN venues v ON v.id = sc.venue_id::uuid
  ),
  stop_pairs AS (
    SELECT 
      a.path_id,
      a.venue_id AS venue_a,
      b.venue_id AS venue_b,
      a.lat AS lat_a, a.lng AS lng_a,
      b.lat AS lat_b, b.lng AS lng_b
    FROM venue_coords a
    JOIN venue_coords b ON a.path_id = b.path_id AND b.stop_order = a.stop_order + 1
    WHERE a.lat IS NOT NULL AND a.lng IS NOT NULL 
      AND b.lat IS NOT NULL AND b.lng IS NOT NULL
  ),
  meters_by_path AS (
    SELECT 
      pd.path_id,
      pd.label,
      COALESCE(
        SUM(
          CAST(
            6371000 * 2 * ASIN(
              SQRT(
                POWER(SIN(RADIANS(sp.lat_b - sp.lat_a) / 2), 2) +
                COS(RADIANS(sp.lat_a)) * COS(RADIANS(sp.lat_b)) *
                POWER(SIN(RADIANS(sp.lng_b - sp.lng_a) / 2), 2)
              )
            ) AS int
          )
        ),
        0
      ) AS meters
    FROM path_data pd
    LEFT JOIN stop_pairs sp ON pd.path_id = sp.path_id
    GROUP BY pd.path_id, pd.label
  ),
  rsvp AS (
    SELECT 
      rsvp_status,
      COUNT(*) AS count
    FROM plan_participants 
    WHERE plan_id = p_plan_id 
      AND rsvp_status IN ('accepted','maybe','declined','pending')
    GROUP BY rsvp_status
  ),
  rsvp_totals AS (
    SELECT 
      COALESCE(SUM(CASE WHEN rsvp_status = 'accepted' THEN count END), 0) AS accepted,
      COALESCE(SUM(CASE WHEN rsvp_status = 'maybe' THEN count END), 0) AS maybe,
      COALESCE(SUM(CASE WHEN rsvp_status = 'pending' THEN count END), 0) AS pending,
      COALESCE(SUM(CASE WHEN rsvp_status = 'declined' THEN count END), 0) AS declined,
      GREATEST(1, COALESCE(SUM(count), 1)) AS total
    FROM rsvp
  ),
  scored AS (
    SELECT 
      mp.path_id,
      mp.label,
      mp.meters,
      (1.0 - (rt.accepted::numeric / rt.total)) AS coordination,
      LEAST(1.0, GREATEST(0.0, (mp.meters - 800.0) / 2200.0)) AS logistics,
      LEAST(1.0, 0.15 + 0.5 * (rt.maybe + rt.pending)::numeric / rt.total) AS social,
      CASE 
        WHEN p_budget_per_person IS NULL OR p_budget_per_person <= 0 THEN 0.0
        ELSE (
          SELECT 
            LEAST(1.0, GREATEST(0.0, 
              (avg_cost - p_budget_per_person) / GREATEST(20, p_budget_per_person)
            ))
          FROM (
            SELECT 
              COALESCE(
                AVG(COALESCE(v.price_level, 2) * 30.0),
                60.0
              ) AS avg_cost
            FROM jsonb_array_elements(p_paths_json) AS path_elem
            CROSS JOIN jsonb_array_elements(path_elem->'stops') AS stop_elem
            LEFT JOIN venues v ON v.id = (stop_elem->>'venue_id')::uuid
            WHERE (path_elem->>'id')::text = mp.path_id
          ) costs
        )
      END AS financial
    FROM meters_by_path mp
    CROSS JOIN rsvp_totals rt
  )
SELECT
  path_id,
  label,
  meters,
  coordination::float8,
  logistics::float8,
  social::float8,
  financial::float8,
  (p_w_coord * coordination + p_w_logi * logistics + p_w_soc * social + p_w_fin * financial)::float8 AS friction,
  ROUND(100 * (p_w_coord * coordination + p_w_logi * logistics + p_w_soc * social + p_w_fin * financial))::int AS friction_score_pct
FROM scored
ORDER BY friction ASC, meters ASC, path_id ASC;
$fn$;