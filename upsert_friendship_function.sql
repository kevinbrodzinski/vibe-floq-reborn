BEGIN;

/*------------------------------------------------------------
  0. Safety – make sure the ENUM exists
------------------------------------------------------------*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'friend_state'
  ) THEN
    RAISE EXCEPTION 'ENUM friend_state is missing – run previous steps first.';
  END IF;
END $$;

/*------------------------------------------------------------
  1. Normalise a pair of UUIDs so (low,high) ordering is easy
------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION public.norm_pair(a uuid, b uuid)
RETURNS TABLE(low uuid, high uuid)
LANGUAGE SQL IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN a < b THEN a ELSE b END  AS low,
         CASE WHEN a < b THEN b ELSE a END  AS high;
$$;

/*------------------------------------------------------------
  2. Main upsert function – idempotent friend / request handler
     _other  : the other user's id
     _action : 'pending' | 'accepted' | 'blocked' | 'declined'
------------------------------------------------------------*/
DROP FUNCTION IF EXISTS public.upsert_friendship(uuid, friend_state);

CREATE FUNCTION public.upsert_friendship(
  _other  uuid,
  _action friend_state DEFAULT 'pending'  -- convenience default
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me   uuid := auth.uid();        -- caller
  pair RECORD;
BEGIN
  /* 1. sanity checks */
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF me = _other THEN
    RAISE EXCEPTION 'Cannot befriend yourself';
  END IF;

  /* 2. canonical order */
  SELECT * INTO pair FROM norm_pair(me, _other);

  /* 3. perform the upsert */
  INSERT INTO public.friendships AS f
         (user_low, user_high, friend_state, responded_at)
  VALUES (pair.low, pair.high, _action,
          CASE WHEN _action <> 'pending' THEN NOW() END)
  ON CONFLICT (user_low, user_high)                     -- the PK
  DO UPDATE
     SET friend_state = EXCLUDED.friend_state,
         responded_at = CASE                   -- stamp once
                          WHEN f.responded_at IS NULL
                               AND EXCLUDED.friend_state <> 'pending'
                          THEN NOW()
                          ELSE f.responded_at
                        END;

END;
$$;

/*------------------------------------------------------------
  3. Grant execution to normal signed-in users
------------------------------------------------------------*/
GRANT EXECUTE ON FUNCTION public.upsert_friendship(uuid, friend_state)
       TO authenticated;

COMMIT;