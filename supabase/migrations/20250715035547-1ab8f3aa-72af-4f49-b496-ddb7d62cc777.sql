-- Drop existing functions that conflict
DROP FUNCTION IF EXISTS public.accept_friend_request(uuid);
DROP FUNCTION IF EXISTS public.add_friend(uuid);

-- =============================================================================
--  Advanced Search ✚ Friend-Graph  (FINAL / SHIP)
--  ▸ Fixes useMyFlocks aggregation bug
--  ▸ Introduces unified friends system + activity feed
--  ▸ Keeps all search-floq indexes from Phase A-2
-- =============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ──────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. get_floq_participant_counts()  – replaces broken .group() call
-- ──────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_floq_participant_counts(uuid[]);
CREATE OR REPLACE FUNCTION public.get_floq_participant_counts(floq_ids uuid[])
RETURNS TABLE (floq_id uuid, participant_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF floq_ids IS NULL OR array_length(floq_ids,1) IS NULL THEN
    RETURN;                               -- empty set, avoids "empty IN ()"
  END IF;

  RETURN QUERY
  SELECT fp.floq_id, COUNT(*)::bigint
  FROM public.floq_participants fp
  WHERE fp.floq_id = ANY(floq_ids)
  GROUP BY fp.floq_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_floq_participant_counts(uuid[]) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. FRIENDS TABLE  (bidirectional, single source of truth)
-- ──────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.friends CASCADE;

CREATE TABLE public.friends (
  user_a        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  CHECK (user_a <> user_b)                      -- no self-friendships
);

-- undirected uniqueness (smaller UUID first)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_friends_undirected
ON public.friends (LEAST(user_a,user_b), GREATEST(user_a,user_b));

CREATE INDEX IF NOT EXISTS idx_friends_user_a ON public.friends(user_a);
CREATE INDEX IF NOT EXISTS idx_friends_user_b ON public.friends(user_b);
CREATE INDEX IF NOT EXISTS idx_friends_status  ON public.friends(status);

-- realtime support
ALTER TABLE public.friends REPLICA IDENTITY FULL;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- single policy that covers all verbs
CREATE POLICY friends_rw
  ON public.friends
  FOR ALL
  TO authenticated
  USING      (auth.uid() IS NOT NULL AND (user_a = auth.uid() OR user_b = auth.uid()))
  WITH CHECK (auth.uid() IS NOT NULL AND (user_a = auth.uid() OR user_b = auth.uid()));

-- ──────────────────────────────────────────────────────────────────────────────
-- 3.  RPC HELPERS
-- ──────────────────────────────────────────────────────────────────────────────
-- canonicalise a pair
CREATE OR REPLACE FUNCTION public.friend_pair(a uuid,b uuid)
RETURNS TABLE (ua uuid, ub uuid)
LANGUAGE sql IMMUTABLE
AS $$ SELECT LEAST(a,b) AS ua, GREATEST(a,b) AS ub; $$;

-- send / (re)request friendship
CREATE OR REPLACE FUNCTION public.send_friend_request(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  me uuid := auth.uid();
  pa uuid; pb uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF me = _target THEN RAISE EXCEPTION 'Cannot friend yourself'; END IF;

  SELECT * INTO pa,pb FROM friend_pair(me,_target);

  INSERT INTO public.friends (user_a,user_b,status)
  VALUES (pa,pb,'pending')
  ON CONFLICT (LEAST(user_a,user_b),GREATEST(user_a,user_b))
  DO UPDATE SET
    status       = CASE WHEN friends.status='accepted' THEN 'accepted' ELSE 'pending' END,
    created_at   = CASE WHEN friends.status='accepted' THEN friends.created_at ELSE now() END,
    responded_at = NULL;

  RETURN jsonb_build_object('success',true,'message','request-sent');
END;
$$;

-- accept
CREATE OR REPLACE FUNCTION public.accept_friend_request(_friend uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  me uuid := auth.uid();
  pa uuid; pb uuid; rows int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO pa,pb FROM friend_pair(me,_friend);

  UPDATE public.friends
  SET status='accepted', responded_at=now()
  WHERE LEAST(user_a,user_b)=pa AND GREATEST(user_a,user_b)=pb AND status='pending'
  RETURNING 1 INTO rows;

  IF rows IS NULL THEN RAISE EXCEPTION 'No pending request'; END IF;
  RETURN jsonb_build_object('success',true,'message','accepted');
END;
$$;

-- remove
CREATE OR REPLACE FUNCTION public.remove_friend(_friend uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  me uuid := auth.uid();
  pa uuid; pb uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO pa,pb FROM friend_pair(me,_friend);

  DELETE FROM public.friends
  WHERE LEAST(user_a,user_b)=pa AND GREATEST(user_a,user_b)=pb;

  RETURN jsonb_build_object('success',true,'message','removed');
END;
$$;

-- list accepted
CREATE OR REPLACE FUNCTION public.get_friends_list(_uid uuid DEFAULT auth.uid())
RETURNS TABLE(friend_id uuid, username citext, display_name text,
              avatar_url text, bio text, friend_since timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN f.user_a=_uid THEN f.user_b ELSE f.user_a END,
         pr.username, pr.display_name, pr.avatar_url, pr.bio,
         f.responded_at
  FROM public.friends f
  JOIN public.profiles pr
    ON pr.id = CASE WHEN f.user_a=_uid THEN f.user_b ELSE f.user_a END
  WHERE f.status='accepted'
    AND (_uid IN (f.user_a,f.user_b))
  ORDER BY f.responded_at DESC;
$$;

-- pending for ME
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests(_uid uuid DEFAULT auth.uid())
RETURNS TABLE(requester_id uuid, username citext, display_name text,
              avatar_url text, requested_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN f.user_a=_uid THEN f.user_b ELSE f.user_a END,
         pr.username, pr.display_name, pr.avatar_url,
         f.created_at
  FROM public.friends f
  JOIN public.profiles pr
    ON pr.id = CASE WHEN f.user_a=_uid THEN f.user_b ELSE f.user_a END
  WHERE f.status='pending'
    AND (_uid IN (f.user_a,f.user_b))
    AND f.user_a <> _uid                       -- I'm the recipient
  ORDER BY f.created_at DESC;
$$;

-- friend activity feed
CREATE OR REPLACE FUNCTION public.get_friend_feed(
  _since  timestamptz DEFAULT now()-interval '7 days',
  _limit  int         DEFAULT 40,
  _uid    uuid        DEFAULT auth.uid()
)
RETURNS TABLE(
  floq_id uuid, joined_at timestamptz, role text,
  floq_title text, primary_vibe vibe_enum,
  friend_id uuid, friend_username citext,
  friend_display_name text, friend_avatar_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH my_friends AS (
    SELECT CASE WHEN user_a=_uid THEN user_b ELSE user_a END AS fid
    FROM public.friends
    WHERE status='accepted' AND _uid IN (user_a,user_b)
  )
  SELECT fp.floq_id, fp.joined_at, fp.role,
         fl.title, fl.primary_vibe,
         fp.user_id AS friend_id,
         pr.username, pr.display_name, pr.avatar_url
  FROM public.floq_participants fp
  JOIN my_friends mf            ON mf.fid = fp.user_id
  JOIN public.floqs fl          ON fl.id = fp.floq_id AND fl.deleted_at IS NULL
  JOIN public.profiles pr       ON pr.id = fp.user_id
  WHERE fp.joined_at >= _since
    AND fp.user_id <> _uid
  ORDER BY fp.joined_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid)                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends_list(uuid)                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_friend_requests(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_feed(timestamptz,int,uuid)         TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. SEARCH-FLOQS INDEXES  (kept for reference – creates if absent)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_floqs_location_gist
  ON public.floqs USING gist(location);
CREATE INDEX IF NOT EXISTS idx_floqs_title_trgm
  ON public.floqs USING gin(lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_floqs_visibility_deleted
  ON public.floqs(visibility, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_floqs_vibe_time
  ON public.floqs(primary_vibe, starts_at);
CREATE INDEX IF NOT EXISTS idx_floqs_starts_at
  ON public.floqs(starts_at);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5.  Realtime publication
-- ──────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;