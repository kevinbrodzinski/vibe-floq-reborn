------------------------------------------------------------------
-- 1 ▸  Turn RLS on
------------------------------------------------------------------
ALTER TABLE public.weather_cache
  ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------------
-- 2 ▸  Anyone may read the cache          (optional: lock to authed)
------------------------------------------------------------------
CREATE POLICY weather_cache_read
  ON public.weather_cache
  FOR SELECT
  USING (true);              -- change to (auth.role() = 'authenticated') if you
                             -- really want to hide weather from anon visitors.

------------------------------------------------------------------
-- 3 ▸  Only the service-role may write / delete
--     (Edge-functions run with that key)
------------------------------------------------------------------
CREATE POLICY weather_cache_write
  ON public.weather_cache
  FOR INSERT, UPDATE, DELETE
  USING     (auth.role() = 'service_role')
  WITH CHECK(auth.role() = 'service_role');