-- Phase 4 : Friends graph  +  friends-only presence
-------------------------------------------------------------------

-- A. Rename legacy table (only if not done already)
DO $$
BEGIN
  IF to_regclass('public.friend_requests') IS NULL
     AND to_regclass('public.friends') IS NOT NULL THEN
    ALTER TABLE public.friends RENAME TO friend_requests;
  END IF;
END $$;

-------------------------------------------------------------------
-- B. Undirected friendships (one row per pair, lowest UUID first)
-------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friendships (
  user_id    uuid REFERENCES auth.users NOT NULL,
  friend_id  uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- Ordering trigger: ensures (lower-uuid, higher-uuid)
CREATE OR REPLACE FUNCTION public.friends_insert_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id > NEW.friend_id THEN
    RETURN NEW #= jsonb_build_object('user_id', NEW.friend_id,
                                     'friend_id', NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_friends_order ON public.friendships;
CREATE TRIGGER trg_friends_order
  BEFORE INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.friends_insert_guard();

-- Indexes for both directions
CREATE INDEX IF NOT EXISTS idx_friendships_user   ON public.friendships (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships (friend_id);

COMMENT ON TABLE public.friendships IS
  'Undirected friendship graph (one row per pair).';

-------------------------------------------------------------------
-- C. Row-level security
-------------------------------------------------------------------
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "friend ops" ON public.friendships;

CREATE POLICY "friend ops"
  ON public.friendships
  FOR ALL
  USING  (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-------------------------------------------------------------------
-- D. RPC helpers
-------------------------------------------------------------------
-- add_friend
CREATE OR REPLACE FUNCTION public.add_friend(target uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (auth.uid(), target)
  ON CONFLICT DO NOTHING;
$$;
ALTER FUNCTION public.add_friend OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.add_friend TO authenticated;

-- remove_friend
CREATE OR REPLACE FUNCTION public.remove_friend(target uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.friendships
  WHERE (user_id = auth.uid() AND friend_id = target)
     OR (friend_id = auth.uid() AND user_id = target);
$$;
ALTER FUNCTION public.remove_friend OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.remove_friend TO authenticated;

-- list_friends
CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
           WHEN user_id = auth.uid() THEN friend_id
           ELSE user_id
         END
  FROM public.friendships
  WHERE user_id = auth.uid() OR friend_id = auth.uid();
$$;
ALTER FUNCTION public.list_friends OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.list_friends TO authenticated;

-- friend_count
CREATE OR REPLACE FUNCTION public.friend_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COUNT(*)
  FROM public.friendships
  WHERE user_id = auth.uid() OR friend_id = auth.uid();
$$;
ALTER FUNCTION public.friend_count OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.friend_count TO authenticated;

-------------------------------------------------------------------
-- E. Presence filter (drops all old overloads, installs one canonical)
-------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.presence_nearby(NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.presence_nearby(NUMERIC, NUMERIC, NUMERIC, BOOLEAN);

CREATE FUNCTION public.presence_nearby(
  lat NUMERIC,
  lng NUMERIC,
  km  NUMERIC,
  include_self BOOLEAN DEFAULT false
) RETURNS SETOF public.vibes_now
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT *
  FROM public.vibes_now v
  WHERE ST_DWithin(
          v.geo,
          ST_MakePoint(lng, lat)::geography,
          km * 1000
        )
    AND v.expires_at > NOW()
    AND (include_self OR v.user_id <> auth.uid())
    AND (
          COALESCE(v.visibility,'public') = 'public'
       OR (v.visibility = 'friends'
           AND EXISTS (
                 SELECT 1
                 FROM public.friendships f
                 WHERE (f.user_id   = auth.uid() AND f.friend_id = v.user_id)
                    OR (f.friend_id = auth.uid() AND f.user_id   = v.user_id)
               )
          )
        );
$$;

ALTER FUNCTION public.presence_nearby OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.presence_nearby TO anon, authenticated;