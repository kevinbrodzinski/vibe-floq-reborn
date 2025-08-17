-- 02A: drop dependent views first (if they exist)
DROP VIEW IF EXISTS public.v_venue_open_state CASCADE;

-- 02B: if venue_hours is a view/mview, drop; then create table
DO $$
DECLARE kind char;
BEGIN
  SELECT c.relkind
    INTO kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'venue_hours';

  IF kind = 'v' THEN
    EXECUTE 'DROP VIEW public.venue_hours';
  ELSIF kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.venue_hours';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.venue_hours (
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE,
  dow      int  NOT NULL CHECK (dow BETWEEN 0 AND 6),
  open     time NOT NULL,
  close    time NOT NULL,
  PRIMARY KEY (venue_id, dow, open, close)
);

CREATE INDEX IF NOT EXISTS idx_venue_hours_venue_dow
  ON public.venue_hours (venue_id, dow);