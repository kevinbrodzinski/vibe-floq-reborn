/* =====================================================================
   External Place Feeds – final integration (fixed)
   --------------------------------------------------------------------- */

------------------------------- 1 ▸ provider catalogue (safe-idempotent)
CREATE SCHEMA IF NOT EXISTS integrations;

CREATE TABLE IF NOT EXISTS integrations.provider (
  id   smallserial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

INSERT INTO integrations.provider(name)
VALUES ('google'), ('foursquare')
ON CONFLICT DO NOTHING;

------------------------------- 2 ▸ per-user API keys
CREATE TABLE IF NOT EXISTS integrations.user_credential (
  id          bigserial PRIMARY KEY,
  user_id     uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id smallint  NOT NULL REFERENCES integrations.provider(id),
  api_key     text      NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, provider_id)
);

ALTER TABLE integrations.user_credential ENABLE ROW LEVEL SECURITY;

-- Create policy only if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE  schemaname = 'integrations'
       AND tablename  = 'user_credential'
       AND policyname = 'owner_api_key') THEN
    CREATE POLICY owner_api_key
      ON integrations.user_credential
      FOR ALL USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

------------------------------- 3 ▸ raw inbox
CREATE UNLOGGED TABLE IF NOT EXISTS integrations.place_feed_raw (
  id           bigserial PRIMARY KEY,
  user_id      uuid,
  provider_id  smallint REFERENCES integrations.provider(id),
  fetched_at   timestamptz DEFAULT now(),
  processed_at timestamptz,
  payload      jsonb
);

CREATE INDEX IF NOT EXISTS idx_feed_raw_fetched
  ON integrations.place_feed_raw (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_raw_unprocessed
  ON integrations.place_feed_raw (processed_at)
  WHERE processed_at IS NULL;

------------------------------- 4 ▸ venue normaliser
CREATE OR REPLACE FUNCTION integrations.normalise_place_feed()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = integrations, public
AS $$
DECLARE
  done int := 0;
BEGIN
  WITH to_process AS (
    SELECT id, user_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    ORDER BY fetched_at
    LIMIT 200
  ),
  processed AS (
    UPDATE integrations.place_feed_raw
       SET processed_at = now()
     WHERE id IN (SELECT id FROM to_process)
     RETURNING user_id, provider_id, payload
  ),
  unraveled AS (
    SELECT
      p.user_id,
      p.provider_id,
      jsonb_path_query(value, '$') AS item
    FROM processed p,
         LATERAL jsonb_path_query(
           p.payload,
           CASE p.provider_id
             WHEN 1 THEN '$.results[*]'       -- Google
             WHEN 2 THEN '$.results[*]'       -- Foursquare
           END
         ) value
  ),
  venues AS (
    INSERT INTO public.venues
            (provider, provider_id, name, lat, lng, geom, categories, source)
    SELECT
      CASE provider_id WHEN 1 THEN 'google' ELSE 'foursquare' END,
      COALESCE(item->>'place_id', item->>'fsq_id'),
      COALESCE(item->>'name', item->>'name'),
      CASE provider_id
        WHEN 1 THEN (item#>>'{geometry,location,lat}')::float
        ELSE       (item#>>'{geocodes,main,latitude}')::float
      END,
      CASE provider_id
        WHEN 1 THEN (item#>>'{geometry,location,lng}')::float
        ELSE       (item#>>'{geocodes,main,longitude}')::float
      END,
      ST_SetSRID(
        ST_MakePoint(
          CASE provider_id
            WHEN 1 THEN (item#>>'{geometry,location,lng}')::float
            ELSE       (item#>>'{geocodes,main,longitude}')::float
          END,
          CASE provider_id
            WHEN 1 THEN (item#>>'{geometry,location,lat}')::float
            ELSE       (item#>>'{geocodes,main,latitude}')::float
          END
        ), 4326),
      CASE provider_id
        WHEN 1 THEN (
          SELECT array_agg(x::text)
          FROM jsonb_array_elements_text(item->'types') AS x
        )
        ELSE (
          SELECT array_agg((c->>'name')::text)
          FROM jsonb_array_elements(item->'categories') c
        )
      END,
      'import'
    FROM unraveled
    WHERE COALESCE(item->>'place_id', item->>'fsq_id') IS NOT NULL
    ON CONFLICT (provider, provider_id) DO UPDATE
      SET name       = EXCLUDED.name,
          categories = EXCLUDED.categories
    RETURNING provider, provider_id, id
  )
  SELECT COUNT(*) INTO done FROM venues;
  RETURN done;
END;
$$;

------------------------------- 5 ▸ cron scheduler (only if doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'normalise_place_feed') THEN
    PERFORM cron.schedule(
      'normalise_place_feed',
      '*/2 * * * *',
      $$SELECT integrations.normalise_place_feed();$$
    );
  END IF;
END $$;

------------------------------- 6 ▸ place_details cache update (add is_expired column)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'place_details' 
      AND column_name = 'is_expired'
  ) THEN
    ALTER TABLE public.place_details 
    ADD COLUMN is_expired boolean GENERATED ALWAYS AS
    (fetched_at < (now() - interval '7 days')) STORED;
    
    CREATE INDEX idx_place_details_expired
      ON public.place_details (is_expired)
      WHERE is_expired;
  END IF;
END $$;