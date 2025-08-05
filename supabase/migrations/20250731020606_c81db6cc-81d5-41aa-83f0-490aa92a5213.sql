/* ==================================================================
   20250727_place_details_cache.sql
   ------------------------------------------------------------------
   •  Caches Google / Foursquare "Place details" JSON responses
   •  Marks rows older than 7 days via generated column `is_expired`
   •  Read-only for all authenticated users
   ================================================================== */

-- 1️⃣  Table -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.place_details (
  place_id    text PRIMARY KEY,
  data        jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now(),
  profile_id  uuid REFERENCES public.profiles(id)
);

-- 2️⃣  Generated flag + index (add only if missing) ---------------------------
DO
$$
BEGIN
  IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'place_details'
          AND  column_name  = 'is_expired'
     ) THEN
    ALTER TABLE public.place_details
      ADD COLUMN is_expired boolean
      GENERATED ALWAYS AS (fetched_at < (now() - interval '7 days')) STORED;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_place_details_expired
  ON public.place_details (is_expired);

-- 3️⃣  TTL helper index on fetched_at (for range scans / ORDER BY) -------------
CREATE INDEX IF NOT EXISTS idx_place_details_fetched_at
  ON public.place_details (fetched_at);

-- 4️⃣  Row-level security (run only once) -------------------------------------
ALTER TABLE public.place_details ENABLE ROW LEVEL SECURITY;

-- Allow every authenticated user to read the cache
CREATE POLICY IF NOT EXISTS "read_any_place_cache"
  ON public.place_details
  FOR SELECT
  USING (true);

-- Block direct inserts / updates / deletes from clients
CREATE POLICY IF NOT EXISTS "no_direct_write_place_cache"
  ON public.place_details
  FOR ALL
  USING (false)
  WITH CHECK (false);