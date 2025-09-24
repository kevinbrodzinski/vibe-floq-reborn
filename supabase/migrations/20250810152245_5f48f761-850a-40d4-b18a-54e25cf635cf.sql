-- Stabilize realtime on vibes_now by including full row data
ALTER TABLE IF EXISTS public.vibes_now REPLICA IDENTITY FULL;