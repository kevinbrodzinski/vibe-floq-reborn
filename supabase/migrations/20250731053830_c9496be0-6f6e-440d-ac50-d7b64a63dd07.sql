-- Add spatial index for venues.geom if not exists (major performance boost for ST_DWithin)
CREATE INDEX IF NOT EXISTS idx_venues_geo_gist ON venues USING GIST (geom);