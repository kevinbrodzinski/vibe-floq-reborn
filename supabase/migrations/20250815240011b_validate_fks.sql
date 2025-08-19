-- 11b: VALIDATE constraints only if no orphans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.venue_visits vv
    LEFT JOIN public.venues v ON v.id = vv.venue_id
    WHERE vv.venue_id IS NOT NULL AND v.id IS NULL
    LIMIT 1
  ) THEN
    ALTER TABLE public.venue_visits
    VALIDATE CONSTRAINT fk_venue_visits_venue;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.venue_stays vs
    LEFT JOIN public.venues v ON v.id = vs.venue_id
    WHERE vs.venue_id IS NOT NULL AND v.id IS NULL
    LIMIT 1
  ) THEN
    ALTER TABLE public.venue_stays
    VALIDATE CONSTRAINT fk_venue_stays_venue;
  END IF;
END$$;