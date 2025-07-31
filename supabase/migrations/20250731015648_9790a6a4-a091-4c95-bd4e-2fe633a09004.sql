-- Step 5: Place details cache table
CREATE TABLE IF NOT EXISTS public.place_details (
  place_id    text PRIMARY KEY,
  data        jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now(),
  profile_id  uuid REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_place_details_ttl
  ON public.place_details (fetched_at)
  WHERE fetched_at < (now() - interval '7 days');

ALTER TABLE public.place_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_any"
  ON public.place_details FOR SELECT USING (true);

CREATE POLICY "no_write"
  ON public.place_details FOR ALL
  USING (false) WITH CHECK (false);