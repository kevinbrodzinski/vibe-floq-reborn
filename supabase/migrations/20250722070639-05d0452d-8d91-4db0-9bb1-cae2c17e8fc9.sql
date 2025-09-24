-- Fix duplicate venue slugs by making them unique
-- First, add temporary suffix to duplicates
WITH duplicate_slugs AS (
  SELECT slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM public.venues 
  WHERE slug IS NOT NULL
),
updates AS (
  SELECT v.id, 
         CASE 
           WHEN ds.rn > 1 THEN v.slug || '-' || ds.rn::text
           ELSE v.slug 
         END as new_slug
  FROM public.venues v
  JOIN duplicate_slugs ds ON v.slug = ds.slug
  WHERE ds.rn > 1
)
UPDATE public.venues 
SET slug = updates.new_slug
FROM updates 
WHERE venues.id = updates.id;

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS venues_slug_key ON public.venues(slug);