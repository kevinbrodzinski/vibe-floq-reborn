-- 11d: add tstzrange + gist index (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venue_visits' AND column_name='visit_ts'
  ) THEN
    ALTER TABLE public.venue_visits
      ADD COLUMN visit_ts tstzrange
      GENERATED ALWAYS AS (tstzrange(arrived_at, departed_at)) STORED;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_visits_ts_gist
  ON public.venue_visits
  USING GIST (profile_id, visit_ts);