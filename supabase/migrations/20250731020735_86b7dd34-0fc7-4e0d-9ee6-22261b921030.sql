/* ==================================================================
   Place details cache table - simplified version
   ------------------------------------------------------------------
   •  Caches Google / Foursquare "Place details" JSON responses
   •  Read-only for all authenticated users
   ================================================================== */

-- 1️⃣  Table -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_details (
  place_id    text PRIMARY KEY,
  data        jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now(),
  profile_id  uuid REFERENCES public.profiles(id)
);

-- 2️⃣  Index on fetched_at for TTL queries ----------------------------------
CREATE INDEX IF NOT EXISTS idx_place_details_fetched_at
  ON public.place_details (fetched_at);

-- 3️⃣  Row-level security ---------------------------------------------------
ALTER TABLE public.place_details ENABLE ROW LEVEL SECURITY;

-- Allow every authenticated user to read the cache
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'place_details' 
    AND policyname = 'read_any_place_cache'
  ) THEN
    EXECUTE 'CREATE POLICY read_any_place_cache ON public.place_details FOR SELECT USING (true)';
  END IF;
END;
$$;

-- Block direct inserts / updates / deletes from clients
DO
$$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'place_details' 
    AND policyname = 'no_direct_write_place_cache'
  ) THEN
    EXECUTE 'CREATE POLICY no_direct_write_place_cache ON public.place_details FOR ALL USING (false) WITH CHECK (false)';
  END IF;
END;
$$;