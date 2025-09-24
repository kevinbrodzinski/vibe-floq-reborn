-- =========================================================
-- VENUE OPEN STATE VIEW: Option A (Recommended)
-- Creates v_venue_open_state for real-time venue status
-- Safe, idempotent, no table schema changes
-- =========================================================
SET search_path = public;

-- First, create a simple timezone helper function if it doesn't exist
-- This is a placeholder - replace with your actual timezone logic
CREATE OR REPLACE FUNCTION public.get_venue_timezone(p_venue_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  -- Simple fallback - in production you'd use venue.lat/lng to determine timezone
  -- For now, assume all venues are in user's timezone or UTC
  SELECT COALESCE(
    -- You could join to a venue_timezones table or use lat/lng lookup
    'America/Los_Angeles', -- Default to PST for demo
    'UTC'
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_venue_timezone(uuid) TO authenticated;

-- View: v_venue_open_state
-- Depends on: public.venues, public.venue_hours, public.get_venue_timezone(uuid)
CREATE OR REPLACE VIEW public.v_venue_open_state AS
WITH tz AS (
  SELECT v.id AS venue_id, public.get_venue_timezone(v.id) AS tzid
  FROM public.venues v
),
now_local AS (
  SELECT
    t.venue_id,
    t.tzid,
    (now() AT TIME ZONE t.tzid)        AS local_ts,
    ((now() AT TIME ZONE t.tzid)::time) AS local_time,
    EXTRACT(DOW FROM (now() AT TIME ZONE t.tzid))::int AS local_dow
  FROM tz t
),
hours AS (
  SELECT vh.venue_id, vh.dow, vh.open, vh.close
  FROM public.venue_hours vh
),
today AS (
  SELECT
    n.venue_id,
    n.tzid,
    n.local_time,
    n.local_dow,
    COALESCE(
      array_agg(to_char(vh.open,'HH24:MI')||'–'||to_char(vh.close,'HH24:MI') ORDER BY vh.open),
      ARRAY[]::text[]
    ) AS hours_today,
    COALESCE(
      bool_or(
        CASE
          WHEN vh.close > vh.open
            THEN (n.local_time >= vh.open AND n.local_time < vh.close)
          -- overnight window like 20:00–02:00
          ELSE (n.local_time >= vh.open OR n.local_time < vh.close)
        END
      ),
      false
    ) AS open_now
  FROM now_local n
  LEFT JOIN hours vh
         ON vh.venue_id = n.venue_id
        AND vh.dow      = n.local_dow
  GROUP BY n.venue_id, n.tzid, n.local_time, n.local_dow
)
SELECT
  v.id                                AS venue_id,
  t.tzid,
  t.hours_today,
  t.open_now
FROM public.venues v
LEFT JOIN today t ON t.venue_id = v.id;

COMMENT ON VIEW public.v_venue_open_state IS
'Per-venue open flag and today''s hours in local venue time. Backed by venue_hours view.';

GRANT SELECT ON public.v_venue_open_state TO authenticated;

-- Optional: Create a helper function to get venue status for multiple venues at once
CREATE OR REPLACE FUNCTION public.get_venues_open_status(p_venue_ids uuid[])
RETURNS TABLE(
  venue_id uuid,
  open_now boolean,
  hours_today text[],
  next_open_time text
)
LANGUAGE sql
STABLE
AS $$
  WITH status AS (
    SELECT 
      vos.venue_id,
      vos.open_now,
      vos.hours_today,
      -- Simple next open time calculation (you could enhance this)
      CASE 
        WHEN vos.open_now THEN null
        WHEN array_length(vos.hours_today, 1) > 0 THEN 
          split_part(vos.hours_today[1], '–', 1)
        ELSE null
      END as next_open_time
    FROM public.v_venue_open_state vos
    WHERE vos.venue_id = ANY(p_venue_ids)
  )
  SELECT s.venue_id, s.open_now, s.hours_today, s.next_open_time
  FROM status s;
$$;

GRANT EXECUTE ON FUNCTION public.get_venues_open_status(uuid[]) TO authenticated;