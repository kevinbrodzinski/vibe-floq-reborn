-- Fix the friends_insert_guard function that uses unsupported #= operator
CREATE OR REPLACE FUNCTION public.friends_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure consistent ordering: smaller user_id becomes user_id, larger becomes friend_id
  IF NEW.user_id > NEW.friend_id THEN
    -- Swap the IDs to maintain consistent ordering
    NEW.user_id := LEAST(NEW.user_id, NEW.friend_id);
    NEW.friend_id := GREATEST(NEW.user_id, NEW.friend_id);
  END IF;
  RETURN NEW;
END;
$$;