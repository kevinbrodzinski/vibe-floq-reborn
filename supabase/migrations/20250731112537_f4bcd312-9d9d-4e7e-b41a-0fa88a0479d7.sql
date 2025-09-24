-- Fix upsert_friendship function parameter names to match TypeScript types
BEGIN;

DROP FUNCTION IF EXISTS public.upsert_friendship(uuid, friend_state);

CREATE FUNCTION public.upsert_friendship(
  _other_user  uuid,
  _new_state friend_state DEFAULT 'pending'  -- convenience default
)
RETURNS friend_state
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
  IF me = _other_user THEN
    RAISE EXCEPTION 'Cannot befriend yourself';
  END IF;

  /* 2. canonical order */
  SELECT * INTO pair FROM norm_pair(me, _other_user);

  /* 3. perform the upsert */
  INSERT INTO public.friendships AS f
         (user_low, user_high, friend_state, responded_at)
  VALUES (pair.low, pair.high, _new_state,
          CASE WHEN _new_state <> 'pending' THEN NOW() END)
  ON CONFLICT (user_low, user_high)                     -- the PK
  DO UPDATE
     SET friend_state = EXCLUDED.friend_state,
         responded_at = CASE                   -- stamp once
                          WHEN f.responded_at IS NULL
                               AND EXCLUDED.friend_state <> 'pending'
                          THEN NOW()
                          ELSE f.responded_at
                        END;

  RETURN _new_state;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_friendship(uuid, friend_state)
       TO authenticated;

COMMIT;