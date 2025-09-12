-- Rally inbox system working with existing schema

-- ===================================================================
-- 1. Helper function for rally membership (works with existing schema)
-- ===================================================================

CREATE OR REPLACE FUNCTION public.is_rally_member(_rally TEXT, _uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rallies r
    LEFT JOIN public.rally_invites ri
      ON ri.rally_id::text = _rally AND ri.to_profile = _uid
    WHERE r.id::text = _rally
      AND (_uid = r.creator_id OR ri.to_profile = _uid)
  );
$$;

REVOKE ALL ON FUNCTION public.is_rally_member(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_rally_member(TEXT, UUID) TO authenticated, anon;

-- ===================================================================
-- 2. Add missing columns to rally_messages to support full functionality
-- ===================================================================

-- Add rally_id column to rally_messages (matching rally_threads.rally_id as TEXT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rally_messages' AND column_name = 'rally_id'
  ) THEN
    ALTER TABLE public.rally_messages ADD COLUMN rally_id TEXT;
  END IF;
END $$;

-- Add author_id column (rename sender_id to author_id for consistency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rally_messages' AND column_name = 'sender_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rally_messages' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE public.rally_messages RENAME COLUMN sender_id TO author_id;
    -- Change data type from text to uuid if needed
    ALTER TABLE public.rally_messages ALTER COLUMN author_id TYPE UUID USING author_id::uuid;
  END IF;
END $$;

-- Update body column to be JSONB instead of TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rally_messages' AND column_name = 'body' AND data_type = 'text'
  ) THEN
    -- First make it nullable to allow conversion
    ALTER TABLE public.rally_messages ALTER COLUMN body DROP NOT NULL;
    -- Convert text to jsonb
    ALTER TABLE public.rally_messages ALTER COLUMN body TYPE JSONB USING 
      CASE 
        WHEN body IS NULL OR body = '' THEN '{}'::jsonb
        ELSE jsonb_build_object('note', body)
      END;
    -- Set default and make not null again
    ALTER TABLE public.rally_messages ALTER COLUMN body SET DEFAULT '{}'::jsonb;
    ALTER TABLE public.rally_messages ALTER COLUMN body SET NOT NULL;
  END IF;
END $$;

-- ===================================================================
-- 3. Trigger to auto-fill rally_id in rally_messages
-- ===================================================================

CREATE OR REPLACE FUNCTION public.rally_messages_fill_rally_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.rally_id IS NULL THEN
    SELECT rally_id INTO NEW.rally_id
    FROM public.rally_threads
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rally_messages_fill_rally_id ON public.rally_messages;
CREATE TRIGGER trg_rally_messages_fill_rally_id
BEFORE INSERT ON public.rally_messages
FOR EACH ROW
EXECUTE FUNCTION public.rally_messages_fill_rally_id();

-- ===================================================================
-- 4. Update existing rally_messages rows to populate rally_id
-- ===================================================================

UPDATE public.rally_messages 
SET rally_id = (
  SELECT rt.rally_id 
  FROM public.rally_threads rt 
  WHERE rt.id = rally_messages.thread_id
)
WHERE rally_id IS NULL;

-- ===================================================================
-- 5. Create indexes for performance
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_rally_messages_rally ON public.rally_messages(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_thread ON public.rally_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_created ON public.rally_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_rally_messages_author ON public.rally_messages(author_id);

-- ===================================================================
-- 6. Fix rally_last_seen table to match rally_threads.rally_id type (TEXT)
-- ===================================================================

-- Check if we need to convert rally_id from UUID to TEXT in rally_last_seen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rally_last_seen' AND column_name = 'rally_id' AND data_type = 'uuid'
  ) THEN
    -- Convert rally_id from UUID to TEXT to match rally_threads
    ALTER TABLE public.rally_last_seen ALTER COLUMN rally_id TYPE TEXT USING rally_id::text;
  END IF;
END $$;

-- ===================================================================
-- 7. Enable RLS and create policies
-- ===================================================================

-- Rally threads policies
ALTER TABLE public.rally_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rally_threads_select ON public.rally_threads;
CREATE POLICY rally_threads_select
ON public.rally_threads
FOR SELECT
USING (public.is_rally_member(rally_id));

DROP POLICY IF EXISTS rally_threads_insert ON public.rally_threads;
CREATE POLICY rally_threads_insert
ON public.rally_threads
FOR INSERT
WITH CHECK (public.is_rally_member(rally_id));

-- Rally messages policies
ALTER TABLE public.rally_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rally_messages_select ON public.rally_messages;
CREATE POLICY rally_messages_select
ON public.rally_messages
FOR SELECT
USING (public.is_rally_member(rally_id));

DROP POLICY IF EXISTS rally_messages_insert ON public.rally_messages;
CREATE POLICY rally_messages_insert
ON public.rally_messages
FOR INSERT
WITH CHECK (
  public.is_rally_member(rally_id) AND 
  (author_id = auth.uid() OR author_id IS NULL)
);

-- Rally last seen policies
ALTER TABLE public.rally_last_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rally_last_seen_self ON public.rally_last_seen;
CREATE POLICY rally_last_seen_self
ON public.rally_last_seen
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- ===================================================================
-- 8. RPC function to mark thread as seen
-- ===================================================================

CREATE OR REPLACE FUNCTION public.rally_mark_thread_seen(_thread UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid TEXT;
BEGIN
  -- Find the rally for this thread
  SELECT rally_id INTO rid
  FROM public.rally_threads
  WHERE id = _thread;

  IF rid IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Membership enforcement
  IF NOT public.is_rally_member(rid, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen)
  VALUES (auth.uid(), rid, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
END;
$$;

REVOKE ALL ON FUNCTION public.rally_mark_thread_seen(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rally_mark_thread_seen(UUID) TO authenticated;