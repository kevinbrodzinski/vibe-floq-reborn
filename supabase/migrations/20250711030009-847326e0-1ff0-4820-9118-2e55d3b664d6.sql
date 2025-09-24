-- ===============================================
-- Place-Aware Event Banners System
-- Dynamic banners for venue events with realtime
-- ===============================================

-- 1️⃣ CREATE PLACE BANNERS TABLE
CREATE TABLE IF NOT EXISTS public.place_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id),
  headline text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '3 minutes'),
  cta_type text NOT NULL DEFAULT 'join' CHECK (cta_type IN ('join', 'route', 'floq')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  -- Generated geohash channel for realtime fan-out
  channel text GENERATED ALWAYS AS (
    substring(st_geohash((SELECT location FROM venues WHERE id = venue_id), 4)::text, 1, 4)
  ) STORED
);

-- Enable RLS
ALTER TABLE public.place_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Public read, no client writes
CREATE POLICY "place_banners_public_read"
  ON public.place_banners
  FOR SELECT
  USING (expires_at > now());

CREATE POLICY "no_client_write"
  ON public.place_banners
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- TTL sanity check - prevent week-long banners
ALTER TABLE public.place_banners 
ADD CONSTRAINT chk_ttl_short 
CHECK (expires_at <= now() + interval '6 hours');

-- Headline length check - keep push payloads small
ALTER TABLE public.place_banners 
ADD CONSTRAINT chk_headline_length 
CHECK (char_length(headline) <= 72);

-- Composite index for efficient querying by channel and expires_at
CREATE INDEX idx_place_banners_channel_exp 
ON public.place_banners(channel, expires_at DESC);

-- Grant permissions for edge functions to write
GRANT ALL ON public.place_banners TO postgres, supabase_admin;

-- 2️⃣ CREATE EDGE FUNCTION RPC
CREATE OR REPLACE FUNCTION public.create_place_banner(
  _venue_id uuid,
  _headline text,
  _cta_type text DEFAULT 'join',
  _ttl_secs integer DEFAULT 180,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banner_id uuid;
BEGIN
  -- Validate inputs
  IF _ttl_secs > 21600 THEN -- 6 hours max
    RAISE EXCEPTION 'TTL cannot exceed 6 hours';
  END IF;
  
  IF char_length(_headline) > 72 THEN
    RAISE EXCEPTION 'Headline too long (max 72 chars)';
  END IF;
  
  -- Insert banner
  INSERT INTO public.place_banners (
    venue_id, 
    headline, 
    cta_type, 
    expires_at,
    metadata
  ) VALUES (
    _venue_id,
    _headline,
    _cta_type,
    now() + (_ttl_secs || ' seconds')::interval,
    _metadata
  ) RETURNING id INTO banner_id;
  
  RETURN banner_id;
END;
$$;

-- 3️⃣ ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.place_banners;