BEGIN;

/* ──────────────────────────────────────────────────────────
   1. Trigger function – overwrite if it already exists
   ──────────────────────────────────────────────────────────*/
DROP FUNCTION IF EXISTS public.friend_set_timestamps();
CREATE FUNCTION public.friend_set_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
     NEW.created_at := NOW();
  ELSIF TG_OP = 'UPDATE' THEN
     -- only fill if caller didn't supply a specific time
     NEW.responded_at := COALESCE(NEW.responded_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

/* ──────────────────────────────────────────────────────────
   2. Trigger (fires before every INSERT / UPDATE)
   ──────────────────────────────────────────────────────────*/
DROP TRIGGER IF EXISTS trg_friend_timestamps ON public.friendships;

CREATE TRIGGER trg_friend_timestamps
BEFORE INSERT OR UPDATE ON public.friendships
FOR EACH ROW
EXECUTE FUNCTION public.friend_set_timestamps();

/* ──────────────────────────────────────────────────────────
   3. Partial index – speeds up "pending / blocked" queries
   ──────────────────────────────────────────────────────────*/
CREATE INDEX IF NOT EXISTS idx_friendships_state
  ON public.friendships(friend_state)
  WHERE friend_state <> 'accepted';

COMMIT;