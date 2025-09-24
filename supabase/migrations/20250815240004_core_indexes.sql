-- 04: fast joins & filters
CREATE INDEX IF NOT EXISTS idx_venues_provider_provider_id
  ON public.venues (provider, provider_id);

CREATE INDEX IF NOT EXISTS idx_venues_geohash5
  ON public.venues (geohash5);

CREATE INDEX IF NOT EXISTS idx_venues_lat_lng
  ON public.venues (lat, lng);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='geom'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venues_geom_gist ON public.venues USING GIST (geom)';
  END IF;
END$$;

-- place_details / aliases
CREATE INDEX IF NOT EXISTS idx_place_details_place_id
  ON public.place_details (place_id);

CREATE INDEX IF NOT EXISTS idx_venue_aliases_provider
  ON public.venue_aliases (provider, provider_id);

CREATE INDEX IF NOT EXISTS idx_venue_aliases_venue
  ON public.venue_aliases (venue_id);

-- venue presence snapshot/live
CREATE INDEX IF NOT EXISTS idx_venue_presence_snapshot_venue
  ON public.venue_presence_snapshot (venue_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venue_presence_snapshot' AND column_name='updated_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venue_presence_snapshot_updated ON public.venue_presence_snapshot (updated_at DESC)';
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_venue_live_presence_venue
  ON public.venue_live_presence (venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_live_presence_profile
  ON public.venue_live_presence (profile_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venue_live_presence' AND column_name='expires_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venue_live_presence_expires ON public.venue_live_presence (expires_at)';
  END IF;
END$$;

-- visits / stays
CREATE INDEX IF NOT EXISTS idx_venue_visits_venue_arrived
  ON public.venue_visits (venue_id, arrived_at DESC);

CREATE INDEX IF NOT EXISTS idx_venue_visits_profile_arrived
  ON public.venue_visits (profile_id, arrived_at DESC);

CREATE INDEX IF NOT EXISTS idx_venue_visits_arrived
  ON public.venue_visits (arrived_at DESC);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venue_stays' AND column_name='arrived_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venue_stays_profile_arrived ON public.venue_stays (profile_id, arrived_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_venue_stays_venue_arrived   ON public.venue_stays (venue_id,   arrived_at DESC)';
  END IF;
END$$;