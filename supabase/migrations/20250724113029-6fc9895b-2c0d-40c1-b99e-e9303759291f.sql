-- External provider integration setup

-- Create integrations schema
CREATE SCHEMA IF NOT EXISTS integrations;

-- Provider catalogue
CREATE TABLE IF NOT EXISTS integrations.provider(
  id SMALLSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO integrations.provider(name)
VALUES ('google'), ('foursquare')
ON CONFLICT DO NOTHING;

-- User API keys
CREATE TABLE IF NOT EXISTS integrations.user_credential(
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID      NOT NULL,
  provider_id SMALLINT  NOT NULL REFERENCES integrations.provider(id),
  api_key     TEXT      NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, provider_id)
);

ALTER TABLE integrations.user_credential ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON integrations.user_credential
  USING (user_id = auth.uid());

-- Raw JSON feed (unlogged for performance)
CREATE UNLOGGED TABLE IF NOT EXISTS integrations.place_feed_raw(
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  provider_id SMALLINT,
  payload     JSONB,
  fetched_at  TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feed_raw_fetched
  ON integrations.place_feed_raw(fetched_at DESC);

-- Add external provider fields to venues
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_id SMALLINT;

-- Add unique constraint for external venues
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.venues
      ADD CONSTRAINT venues_ext_unique
      UNIQUE (external_id, provider_id);
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists
      NULL;
  END;
END $$;

-- Normaliser function (moves raw JSON → venue_visits)
CREATE OR REPLACE FUNCTION integrations.normalise_place_feed()
RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
DECLARE 
  ins INT;
BEGIN
  WITH batch AS (
    SELECT id, user_id, provider_id, payload
    FROM integrations.place_feed_raw
    WHERE processed_at IS NULL
    LIMIT 200
  ), parsed AS (
    SELECT id, user_id,
           jsonb_array_elements(
             CASE provider_id
               WHEN 1 THEN payload->'results'    -- Google
               WHEN 2 THEN payload->'results'    -- Foursquare
             END
           ) AS item
    FROM batch
  ), up AS (
    INSERT INTO public.venue_visits(user_id, venue_id, arrived_at, distance_m)
    SELECT p.user_id,
           v.id,
           now(),
           25
    FROM   parsed p
    JOIN   public.venues v
       ON  v.external_id = COALESCE(p.item->>'place_id', p.item->>'fsq_id')
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  UPDATE integrations.place_feed_raw
     SET processed_at = now()
   WHERE id IN (SELECT id FROM batch);

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END $$;