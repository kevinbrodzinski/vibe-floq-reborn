-- ❶ Provider catalogue and infrastructure
CREATE SCHEMA IF NOT EXISTS integrations;

CREATE TABLE IF NOT EXISTS integrations.provider (
  id   smallserial PRIMARY KEY,
  name text UNIQUE NOT NULL               -- 'google' | 'foursquare' | …
);

INSERT INTO integrations.provider (name)
VALUES ('google'), ('foursquare')
ON CONFLICT DO NOTHING;

-- ❂ Raw feed inbox (unlogged for performance, append-only)
CREATE UNLOGGED TABLE IF NOT EXISTS integrations.place_feed_raw (
  id           bigserial PRIMARY KEY,
  user_id      uuid,
  provider_id  smallint  REFERENCES integrations.provider(id),
  fetched_at   timestamptz DEFAULT now(),
  processed_at timestamptz,
  payload      jsonb
);

CREATE INDEX IF NOT EXISTS idx_feed_raw_fetched
  ON integrations.place_feed_raw (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_raw_unprocessed
  ON integrations.place_feed_raw (processed_at) WHERE processed_at IS NULL;

/* ❸ Normaliser */
CREATE OR REPLACE FUNCTION integrations.normalise_place_feed()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = integrations, public          -- <─ integrations first
AS $$
DECLARE
  ins int := 0;
BEGIN
  /* ---- 1. pick an un-processed batch ----------------------------- */
  WITH to_process AS (
    SELECT id, user_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    ORDER BY fetched_at
    LIMIT 200
  ),
  batch AS (
    UPDATE integrations.place_feed_raw
    SET processed_at = now()
    WHERE id IN (SELECT id FROM to_process)
    RETURNING id, user_id, provider_id, payload
  ),

  /* ---- 2. flatten Google / FSQ payload into one row per place ---- */
  unraveled AS (
    SELECT id,
           user_id,
           provider_id,
           jsonb_path_query_first(               -- ◀ clearer intent
             payload,
             CASE provider_id
               WHEN 1 THEN '$.results[*]'
               WHEN 2 THEN '$.results[*]'
             END
           ) AS item
      FROM batch
  ),

  /* ---- 3. upsert venue catalogue -------------------------------- */
  venues AS (
    INSERT INTO public.venues
            (provider, provider_id, name, lat, lng,
             geom, categories, source)
    SELECT CASE provider_id WHEN 1 THEN 'google' ELSE 'foursquare' END,
           COALESCE(item->>'place_id', item->>'fsq_id'),
           COALESCE(item->>'name',     item->>'name'),
           /* lat */
           CASE provider_id
             WHEN 1 THEN (item#>>'{geometry,location,lat}')::float
             ELSE (item#>>'{geocodes,main,latitude}')::float
           END,
           /* lng */
           CASE provider_id
             WHEN 1 THEN (item#>>'{geometry,location,lng}')::float
             ELSE (item#>>'{geocodes,main,longitude}')::float
           END,
           ST_SetSRID(
             ST_MakePoint(
               /* lon */ CASE provider_id
                           WHEN 1 THEN (item#>>'{geometry,location,lng}')::float
                           ELSE (item#>>'{geocodes,main,longitude}')::float
                         END,
               /* lat */ CASE provider_id
                           WHEN 1 THEN (item#>>'{geometry,location,lat}')::float
                           ELSE (item#>>'{geocodes,main,latitude}')::float
                         END
             ), 4326
           ),
           /* categories */
           CASE provider_id
             WHEN 1 THEN ARRAY(SELECT jsonb_array_elements_text(item->'types'))
             ELSE ARRAY(SELECT jsonb_array_elements(item->'categories')->>'name')
           END,
           'import'
      FROM unraveled
     WHERE COALESCE(item->>'place_id', item->>'fsq_id') IS NOT NULL
    ON CONFLICT (provider, provider_id) DO UPDATE
      SET name       = EXCLUDED.name,
          categories = EXCLUDED.categories
    RETURNING provider, provider_id, id
  ),

  /* ---- 4. record visit ------------------------------------------ */
  visits AS (
    INSERT INTO public.venue_visits
            (user_id, venue_id, arrived_at, distance_m)
    SELECT u.user_id,
           v.id,
           now(),
           25
      FROM unraveled u
      JOIN venues     v USING (provider, provider_id)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )

  /* ---- 5. rows processed ---------------------------------------- */
  SELECT COUNT(*) INTO ins FROM visits;
  RETURN ins;
END;
$$;


/* ❹ Cron: every two minutes, 2 s past the minute */
SELECT cron.schedule(
  'normalise_place_feed',
  '2 */2 * * * *',
  $$ SELECT integrations.normalise_place_feed(); $$
);