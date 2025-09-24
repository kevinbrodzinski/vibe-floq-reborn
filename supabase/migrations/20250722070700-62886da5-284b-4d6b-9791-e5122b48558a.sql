-- Step 1: Add slug column and populate it, handling duplicates
-- First add the column
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS slug citext;

-- Populate with unique slugs
UPDATE public.venues 
SET slug = CASE 
  WHEN name IS NULL THEN 'venue-' || id::text
  ELSE lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || 
       CASE 
         WHEN EXISTS (
           SELECT 1 FROM public.venues v2 
           WHERE v2.id != venues.id 
           AND lower(regexp_replace(v2.name, '[^a-zA-Z0-9]+', '-', 'g')) = lower(regexp_replace(venues.name, '[^a-zA-Z0-9]+', '-', 'g'))
         ) 
         THEN '-' || SUBSTRING(venues.id::text, 1, 8)
         ELSE ''
       END
END
WHERE slug IS NULL;