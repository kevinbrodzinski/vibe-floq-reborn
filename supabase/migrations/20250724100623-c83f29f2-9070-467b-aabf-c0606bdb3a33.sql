-- 06_idx_venue_visits_venue.sql
-- Extra index for build_daily_afterglow
CREATE INDEX IF NOT EXISTS idx_venue_visits_venue
  ON public.venue_visits(venue_id);