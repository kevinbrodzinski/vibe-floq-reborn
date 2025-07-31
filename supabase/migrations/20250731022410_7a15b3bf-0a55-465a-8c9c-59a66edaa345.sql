/* =====================================================================
   External Place Feeds – simplified working version
   --------------------------------------------------------------------- */

-- 1. Create schema and provider table
CREATE SCHEMA IF NOT EXISTS integrations;

CREATE TABLE IF NOT EXISTS integrations.provider (
  id   smallserial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

INSERT INTO integrations.provider(name)
VALUES ('google'), ('foursquare')
ON CONFLICT DO NOTHING;

-- 2. Create user credentials table
CREATE TABLE IF NOT EXISTS integrations.user_credential (
  id          bigserial PRIMARY KEY,
  user_id     uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id smallint  NOT NULL REFERENCES integrations.provider(id),
  api_key     text      NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, provider_id)
);

-- 3. Enable RLS and create policy
ALTER TABLE integrations.user_credential ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS owner_api_key
  ON integrations.user_credential
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Create raw feed table
CREATE UNLOGGED TABLE IF NOT EXISTS integrations.place_feed_raw (
  id           bigserial PRIMARY KEY,
  user_id      uuid,
  provider_id  smallint REFERENCES integrations.provider(id),
  fetched_at   timestamptz DEFAULT now(),
  processed_at timestamptz,
  payload      jsonb
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_feed_raw_fetched
  ON integrations.place_feed_raw (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_raw_unprocessed
  ON integrations.place_feed_raw (processed_at)
  WHERE processed_at IS NULL;

-- 6. Add is_expired column to place_details if it doesn't exist
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