-- Apply performance optimizations for presence counts system

-- 1️⃣ Add generated column for geohash-5 so we can index cheaply
ALTER TABLE public.user_vibe_states
  ADD COLUMN IF NOT EXISTS gh5 text
  GENERATED ALWAYS AS (LEFT(ST_GeoHash(location::geometry,5),5)) STORED;

-- 2️⃣ Create covering index for efficient GROUP BY queries
CREATE INDEX IF NOT EXISTS idx_uvs_active_gh5
  ON public.user_vibe_states (vibe_tag, gh5)
  WHERE active;

-- 3️⃣ Rewrite publisher to single GROUP BY pass for better performance
CREATE OR REPLACE FUNCTION public.publish_presence_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT vibe_tag,
           gh5,
           COUNT(*) AS cnt
    FROM   public.user_vibe_states
    WHERE  active
      AND  started_at > now() - INTERVAL '15 min'
      AND  location IS NOT NULL
      AND  gh5 IS NOT NULL
    GROUP  BY vibe_tag, gh5
  LOOP
    PERFORM pg_notify(
      'presence_counts',
      json_build_object(
        'channel', format('vibe-%s-%s', rec.vibe_tag, rec.gh5),
        'count',   rec.cnt,
        'vibe',    rec.vibe_tag,
        'gh5',     rec.gh5,
        'ts',      NOW()
      )::text
    );
  END LOOP;
END;
$$;

-- 4️⃣ Set function ownership and permissions properly
ALTER FUNCTION public.publish_presence_counts() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.publish_presence_counts() TO service_role;