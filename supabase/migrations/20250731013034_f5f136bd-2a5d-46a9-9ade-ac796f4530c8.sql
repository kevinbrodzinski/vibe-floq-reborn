-- ❶ Provider catalogue and infrastructure
CREATE SCHEMA IF NOT EXISTS integrations;

CREATE TABLE IF NOT EXISTS integrations.provider (
  id   smallserial PRIMARY KEY,
  name text UNIQUE NOT NULL               -- 'google' | 'foursquare' | …
);

INSERT INTO integrations.provider (name)
VALUES ('google'), ('foursquare')
ON CONFLICT DO NOTHING;

-- ❷ Raw feed inbox (unlogged for performance, append-only)
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