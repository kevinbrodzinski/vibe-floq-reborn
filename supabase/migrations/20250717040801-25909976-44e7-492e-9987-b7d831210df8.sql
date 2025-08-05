-- Clean up demo/sample data from plan_stops table
-- Remove any stops with null creator_id (typically sample data)
DELETE FROM public.plan_stops WHERE created_by IS NULL;

-- Remove any stops that contain "Sample" or "sample" in the title (demo data)
DELETE FROM public.plan_stops WHERE title ILIKE '%sample%';

-- Remove any stops with placeholder addresses or descriptions
DELETE FROM public.plan_stops WHERE 
  address ILIKE '%sample%' 
  OR description ILIKE '%sample%'
  OR title = 'New Stop'
  OR title = 'Stop at %';