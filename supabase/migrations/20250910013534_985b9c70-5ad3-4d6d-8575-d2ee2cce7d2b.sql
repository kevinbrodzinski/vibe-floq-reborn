-- Add performance indexes for Flow system
CREATE INDEX IF NOT EXISTS flow_segments_arrived_idx ON flow_segments(arrived_at DESC);
CREATE INDEX IF NOT EXISTS flow_segments_h3_idx ON flow_segments(h3_idx);
CREATE INDEX IF NOT EXISTS flow_segments_center_gix ON flow_segments USING GIST(center);
CREATE INDEX IF NOT EXISTS venues_geom_gix ON venues USING GIST(geom);