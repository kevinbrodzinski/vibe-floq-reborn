-- Enable unaccent extension for handling diacritics
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Modify venues table slug column to be nullable
ALTER TABLE public.venues
  ALTER COLUMN slug DROP NOT NULL,
  ALTER COLUMN slug SET DEFAULT NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_uix
  ON public.venues (slug);

-- Create function to ensure venue slugs are properly generated
CREATE OR REPLACE FUNCTION public.ensure_venue_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Skip slug regeneration if name unchanged and slug exists
  IF TG_OP = 'UPDATE'
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.slug IS NOT NULL
  THEN
    RETURN NEW;
  END IF;

  -- Generate slug if null or empty
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := regexp_replace(
                  unaccent(lower(NEW.name)),
                  '[^a-z0-9\s-]', '', 'g');
    NEW.slug := regexp_replace(NEW.slug, '\s+', '-', 'g');
  END IF;

  -- Clean up leading/trailing hyphens
  NEW.slug := regexp_replace(NEW.slug, '^-+|-+$', '', 'g');

  -- Handle duplicates by appending random suffix
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.slug = NEW.slug AND v.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    );
    NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 6);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS venues_ensure_slug_trigger ON public.venues;
CREATE TRIGGER venues_ensure_slug_trigger
  BEFORE INSERT OR UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_venue_slug();