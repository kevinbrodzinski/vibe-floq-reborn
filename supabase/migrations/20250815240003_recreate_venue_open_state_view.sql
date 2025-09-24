-- 03: view uses venue_hours table
CREATE OR REPLACE VIEW public.v_venue_open_state AS
WITH tz AS (
  SELECT v.id AS venue_id,
         public.get_venue_timezone(v.id) AS tzid
  FROM public.venues v
),
now_local AS (
  SELECT t.venue_id,
         t.tzid,
         (now() AT TIME ZONE t.tzid) AS local_ts,
         (now() AT TIME ZONE t.tzid)::time without time zone AS local_time,
         EXTRACT(dow FROM (now() AT TIME ZONE t.tzid))::int AS local_dow
  FROM tz t
),
hours AS (
  SELECT vh.venue_id, vh.dow, vh.open, vh.close
  FROM public.venue_hours vh
),
today AS (
  SELECT n.venue_id,
         n.tzid,
         n.local_time,
         n.local_dow,
         COALESCE(
           array_agg(to_char(vh.open, 'HH24:MI') || '–' || to_char(vh.close, 'HH24:MI') ORDER BY vh.open),
           ARRAY[]::text[]
         ) AS hours_today,
         COALESCE(bool_or(
           CASE
             WHEN vh.close > vh.open
               THEN (n.local_time >= vh.open AND n.local_time < vh.close)
             ELSE (n.local_time >= vh.open OR n.local_time < vh.close)
           END
         ), false) AS open_now
  FROM now_local n
  LEFT JOIN hours vh
         ON vh.venue_id = n.venue_id
        AND vh.dow = n.local_dow
  GROUP BY n.venue_id, n.tzid, n.local_time, n.local_dow
)
SELECT v.id AS venue_id,
       t.tzid,
       t.hours_today,
       t.open_now
FROM public.venues v
LEFT JOIN today t ON t.venue_id = v.id;