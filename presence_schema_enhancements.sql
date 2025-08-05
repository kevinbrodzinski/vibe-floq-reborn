BEGIN;

/* 1-a.  Add missing shape columns only if they're not present */
ALTER TABLE public.presence
  ADD COLUMN IF NOT EXISTS lat        numeric(9,6),
  ADD COLUMN IF NOT EXISTS lng        numeric(9,6),
  ADD COLUMN IF NOT EXISTS accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS vibe_tag   text;

/* 1-b.  Keep updated_at accurate & initialise started_at */
-- Create the function outside the DO block
CREATE OR REPLACE FUNCTION public.presence_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  IF TG_OP = 'INSERT' THEN
    NEW.started_at := NOW();
  END IF;
  RETURN NEW;
END; 
$$;

-- Drop and create trigger
DROP TRIGGER IF EXISTS trg_presence_timestamps ON public.presence;

CREATE TRIGGER trg_presence_timestamps
BEFORE INSERT OR UPDATE ON public.presence
FOR EACH ROW
EXECUTE FUNCTION public.presence_set_timestamps();

/* 1-c.  Optional indexes: fast friend-presence look-ups */
CREATE INDEX IF NOT EXISTS idx_presence_profile ON public.presence(profile_id);
CREATE INDEX IF NOT EXISTS idx_presence_updated ON public.presence(updated_at DESC);

COMMIT;