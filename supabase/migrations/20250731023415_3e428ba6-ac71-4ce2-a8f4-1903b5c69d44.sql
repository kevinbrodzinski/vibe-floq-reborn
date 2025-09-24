-- Fix place_details table structure for production
ALTER TABLE public.place_details 
ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Add cache expiration logic (24 hour TTL)
CREATE OR REPLACE FUNCTION public.check_place_cache_expiry()
RETURNS trigger AS $$
BEGIN
  -- Mark as expired if data is older than 24 hours
  NEW.is_expired := (NEW.fetched_at < now() - interval '24 hours');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically check expiry on select
CREATE OR REPLACE TRIGGER place_details_check_expiry
  BEFORE SELECT ON public.place_details
  FOR EACH ROW
  EXECUTE FUNCTION public.check_place_cache_expiry();

-- Add performance index for cache lookups
CREATE INDEX IF NOT EXISTS idx_place_details_cache_lookup 
ON public.place_details (place_id, is_expired, fetched_at);

-- Update existing rows to mark expired ones
UPDATE public.place_details 
SET is_expired = (fetched_at < now() - interval '24 hours')
WHERE is_expired IS NULL OR is_expired = FALSE;