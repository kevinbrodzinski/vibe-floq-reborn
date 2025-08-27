BEGIN;

/* ──────────────────────────────────────────────────────────
   Fix send_friend_request function to use friend_requests table
   ──────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.send_friend_request(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  existing_request record;
  existing_friendship record;
BEGIN
  /* 1. sanity checks */
  IF me IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF me = _target THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot send friend request to yourself');
  END IF;

  /* 2. check if already friends */
  SELECT * INTO existing_friendship 
  FROM public.friendships 
  WHERE (profile_low = LEAST(me, _target) AND profile_high = GREATEST(me, _target))
    AND friend_state = 'accepted';
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already friends with this user');
  END IF;

  /* 3. check for existing request */
  SELECT * INTO existing_request 
  FROM public.friend_requests 
  WHERE (profile_id = me AND other_profile_id = _target)
     OR (profile_id = _target AND other_profile_id = me);
  
  IF FOUND THEN
    IF existing_request.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Friend request already exists');
    END IF;
  END IF;

  /* 4. insert new friend request */
  INSERT INTO public.friend_requests (profile_id, other_profile_id, status)
  VALUES (me, _target, 'pending')
  ON CONFLICT (profile_id, other_profile_id) 
  DO UPDATE SET 
    status = 'pending',
    created_at = NOW(),
    responded_at = NULL;

  RETURN jsonb_build_object('success', true, 'message', 'Friend request sent successfully');
END;
$$;

/* ──────────────────────────────────────────────────────────
   Fix accept_friend_request function to work with both tables
   ──────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.accept_friend_request(_friend uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  request_found boolean := false;
BEGIN
  /* 1. sanity checks */
  IF me IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  /* 2. update the friend request to accepted */
  UPDATE public.friend_requests 
  SET status = 'accepted',
      responded_at = NOW()
  WHERE other_profile_id = me 
    AND profile_id = _friend 
    AND status = 'pending';
  
  GET DIAGNOSTICS request_found = FOUND;
  
  IF NOT request_found THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending friend request found');
  END IF;

  /* 3. create the friendship using the corrected upsert function */
  PERFORM public.upsert_friendship(_friend, 'accepted');

  RETURN jsonb_build_object('success', true, 'message', 'Friend request accepted');
END;
$$;

/* ──────────────────────────────────────────────────────────
   Fix upsert_friendship function to use profile_low/profile_high
   ──────────────────────────────────────────────────────────*/
DROP FUNCTION IF EXISTS public.upsert_friendship(uuid, friend_state);

CREATE FUNCTION public.upsert_friendship(
  _other  uuid,
  _action friend_state DEFAULT 'pending'
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  me   uuid := auth.uid();
  profile_low_val uuid;
  profile_high_val uuid;
BEGIN
  /* 1. sanity checks */
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF me = _other THEN
    RAISE EXCEPTION 'Cannot befriend yourself';
  END IF;

  /* 2. canonical order - use LEAST/GREATEST for consistent ordering */
  profile_low_val := LEAST(me, _other);
  profile_high_val := GREATEST(me, _other);

  /* 3. perform the upsert using correct column names */
  INSERT INTO public.friendships AS f
         (profile_low, profile_high, friend_state, responded_at)
  VALUES (profile_low_val, profile_high_val, _action,
          CASE WHEN _action <> 'pending' THEN NOW() END)
  ON CONFLICT (profile_low, profile_high)
  DO UPDATE
     SET friend_state = EXCLUDED.friend_state,
         responded_at = CASE
                          WHEN f.responded_at IS NULL
                               AND EXCLUDED.friend_state <> 'pending'
                          THEN NOW()
                          ELSE f.responded_at
                        END;
END;
$$;

/* ──────────────────────────────────────────────────────────
   Grant permissions
   ──────────────────────────────────────────────────────────*/
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_friendship(uuid, friend_state) TO authenticated;

COMMIT;