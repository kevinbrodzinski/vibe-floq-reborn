-- Update place_details cache expiration from 24 hours to 7 days
CREATE OR REPLACE FUNCTION public.check_place_cache_expiry()
RETURNS trigger AS $$
BEGIN
  -- Mark as expired if data is older than 7 days
  NEW.is_expired := (NEW.fetched_at < now() - interval '7 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update existing rows to mark expired ones (7 days)
UPDATE public.place_details 
SET is_expired = (fetched_at < now() - interval '7 days')
WHERE fetched_at IS NOT NULL;