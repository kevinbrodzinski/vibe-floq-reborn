BEGIN;
SET search_path = public;

-- Column
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS canonical_tags public.canonical_tag[];

-- Backfill
UPDATE public.venues v
SET canonical_tags = public.canonicalize_venue_enum(v.provider, v.categories, v.name)
WHERE v.canonical_tags IS NULL;

-- Trigger
CREATE OR REPLACE FUNCTION public.trg_set_venue_canonical_tags()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.provider  IS DISTINCT FROM OLD.provider
     OR NEW.categories IS DISTINCT FROM OLD.categories
     OR NEW.name      IS DISTINCT FROM OLD.name THEN
    NEW.canonical_tags := public.canonicalize_venue_enum(NEW.provider, NEW.categories, NEW.name);
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_set_venue_canonical_tags ON public.venues;
CREATE TRIGGER trg_set_venue_canonical_tags
BEFORE INSERT OR UPDATE OF provider, categories, name
ON public.venues
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_venue_canonical_tags();

-- Index for && / @>
CREATE INDEX IF NOT EXISTS idx_venues_canonical_gin
  ON public.venues USING gin (canonical_tags);

COMMIT;