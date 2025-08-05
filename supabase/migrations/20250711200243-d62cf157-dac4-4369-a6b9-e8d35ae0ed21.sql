-- ===========================================================
-- FLOQ • FRIEND GRAPH CORE MIGRATION (v0.9-testflight) - Fixed
-- ===========================================================

-- Phase 1: Table Structure Updates
--------------------------------------------------------------

-- Handle friend_requests id column more carefully
DO $$
DECLARE
    has_id_column boolean;
    current_pk_column text;
BEGIN
    -- Check if id column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'friend_requests' 
        AND column_name = 'id'
    ) INTO has_id_column;
    
    -- Get current primary key column
    SELECT a.attname INTO current_pk_column
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'public.friend_requests'::regclass AND i.indisprimary;
    
    -- Add id column if missing and handle primary key
    IF NOT has_id_column THEN
        -- Drop existing primary key if it's not on id
        IF current_pk_column IS NOT NULL AND current_pk_column != 'id' THEN
            EXECUTE 'ALTER TABLE public.friend_requests DROP CONSTRAINT ' || 
                   (SELECT conname FROM pg_constraint WHERE conrelid = 'public.friend_requests'::regclass AND contype = 'p');
        END IF;
        
        -- Add id column and make it primary key
        ALTER TABLE public.friend_requests ADD COLUMN id uuid DEFAULT gen_random_uuid();
        ALTER TABLE public.friend_requests ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add ordering constraint to friendships table
ALTER TABLE public.friendships DROP CONSTRAINT IF EXISTS friendships_order;
ALTER TABLE public.friendships ADD CONSTRAINT friendships_order CHECK (user_id < friend_id);

-- Add proper constraint names if missing
ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_unique_pair;
ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_unique_pair UNIQUE (user_id, friend_id);

ALTER TABLE public.friend_requests DROP CONSTRAINT IF EXISTS friend_requests_not_self;
ALTER TABLE public.friend_requests ADD CONSTRAINT friend_requests_not_self CHECK (user_id <> friend_id);

-- Phase 2: Function Replacements
--------------------------------------------------------------

-- Replace add_friend function
CREATE OR REPLACE FUNCTION public.add_friend(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF target = auth.uid() THEN
    RAISE EXCEPTION 'cannot befriend yourself';
  END IF;

  INSERT INTO public.friend_requests(user_id, friend_id)
  VALUES (auth.uid(), target)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_friend(uuid) TO authenticated;

-- Replace accept_friend_request function  
CREATE OR REPLACE FUNCTION public.accept_friend_request(source uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lo uuid;
  hi uuid;
BEGIN
  -- Mark the request accepted (only recipient can run this)
  UPDATE public.friend_requests
     SET status = 'accepted'
   WHERE user_id  = source
     AND friend_id = auth.uid()
     AND status   = 'pending';

  -- Insert symmetric friendship row
  SELECT least(source, auth.uid()), greatest(source, auth.uid())
    INTO lo, hi;

  INSERT INTO public.friendships(user_id, friend_id)
  VALUES (lo, hi)
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- Replace remove_friend function
CREATE OR REPLACE FUNCTION public.remove_friend(target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Drop friendship (order-independent thanks to PK ordering)
  DELETE FROM public.friendships
   WHERE (user_id  = least(auth.uid(), target)
      AND friend_id = greatest(auth.uid(), target));

  -- Clean up any requests either way
  DELETE FROM public.friend_requests
   WHERE (user_id  = auth.uid() AND friend_id = target)
      OR (user_id  = target    AND friend_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;

-- Phase 3: RLS Policy Updates
--------------------------------------------------------------

-- Friend Requests policies
DROP POLICY IF EXISTS "Friends: send requests" ON public.friend_requests;
CREATE POLICY "Friends: send requests"
ON public.friend_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Friends: accept requests" ON public.friend_requests;
CREATE POLICY "Friends: accept requests"
ON public.friend_requests
FOR UPDATE
USING (friend_id = auth.uid())
WITH CHECK (status = 'accepted');

DROP POLICY IF EXISTS "Friends: mutual visibility" ON public.friend_requests;
CREATE POLICY "Friends: mutual visibility"
ON public.friend_requests
FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Friendships policies
DROP POLICY IF EXISTS "Friendships: user visibility" ON public.friendships;
CREATE POLICY "Friendships: user visibility"
ON public.friendships
FOR SELECT
USING (user_id = auth.uid() OR friend_id = auth.uid());

DROP POLICY IF EXISTS "Friendships: self delete" ON public.friendships;
CREATE POLICY "Friendships: self delete"
ON public.friendships
FOR DELETE
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Phase 4: Index Optimization
--------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_friend_requests_user ON public.friend_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_friend ON public.friend_requests(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);