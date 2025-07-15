-- Live @-mentions system for FloQ messages
-- Migration: 20250715010156-f697669d-27f1-4352-8c11-9a7c36a68393.sql

-- ╭─────────────────────────────────────────────────────────╮
-- │ 1. Message Mentions Table                              │
-- ╰─────────────────────────────────────────────────────────╯

CREATE TABLE IF NOT EXISTS public.message_mentions (
  message_id uuid NOT NULL,
  mentioned_user uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Composite primary key
  PRIMARY KEY (message_id, mentioned_user),
  
  -- Foreign keys with cascade delete
  CONSTRAINT fk_message_mentions_message 
    FOREIGN KEY (message_id) 
    REFERENCES public.floq_messages(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_message_mentions_user 
    FOREIGN KEY (mentioned_user) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE
);

-- ╭─────────────────────────────────────────────────────────╮
-- │ 2. Indexes for Performance                             │
-- ╰─────────────────────────────────────────────────────────╯

-- Index for efficient "who mentioned me?" queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_mentions_user
  ON public.message_mentions (mentioned_user);

-- Index for efficient "who did this message mention?" queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_mentions_msg
  ON public.message_mentions (message_id);

-- ╭─────────────────────────────────────────────────────────╮
-- │ 3. Row Level Security                                  │
-- ╰─────────────────────────────────────────────────────────╯

ALTER TABLE public.message_mentions ENABLE ROW LEVEL SECURITY;

-- Users can only see mentions for messages in floqs they participate in
CREATE POLICY "message_mentions_floq_members_read"
  ON public.message_mentions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.floq_participants fp 
      WHERE fp.user_id = auth.uid() 
        AND fp.floq_id = (
          SELECT floq_id 
          FROM public.floq_messages 
          WHERE id = message_mentions.message_id
        )
    )
  );

-- ╭─────────────────────────────────────────────────────────╮
-- │ 4. Trigger Function for Auto-Extraction               │
-- ╰─────────────────────────────────────────────────────────╯

CREATE OR REPLACE FUNCTION public.extract_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec          RECORD;
  handle_lower TEXT;
BEGIN
  -- Skip if no body content
  IF NEW.body IS NULL OR NEW.body = '' THEN
    RETURN NEW;
  END IF;

  -- Extract all @username mentions using regex with negative lookbehind
  -- Pattern: (?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,32})
  -- This prevents matching emails like foo@bar.com
  FOR rec IN
    SELECT DISTINCT lower(m[1]) AS handle
    FROM regexp_matches(
      NEW.body, 
      '(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,32})', 
      'g'
    ) AS m
  LOOP
    handle_lower := rec.handle;
    
    -- Insert mention record if user exists
    INSERT INTO public.message_mentions (message_id, mentioned_user)
    SELECT NEW.id, p.id
    FROM public.profiles p
    WHERE lower(p.username::text) = handle_lower
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ╭─────────────────────────────────────────────────────────╮
-- │ 5. Update Trigger Function for Message Edits          │
-- ╰─────────────────────────────────────────────────────────╯

CREATE OR REPLACE FUNCTION public.extract_mentions_update()
RETURNS TRIGGER
LANGUAGE plpgsql VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec          RECORD;
  handle_lower TEXT;
BEGIN
  -- Only process if body content actually changed
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    -- Remove existing mentions for this message
    DELETE FROM public.message_mentions 
    WHERE message_id = NEW.id;
    
    -- Re-extract mentions from updated content
    IF NEW.body IS NOT NULL AND NEW.body != '' THEN
      FOR rec IN
        SELECT DISTINCT lower(m[1]) AS handle
        FROM regexp_matches(
          NEW.body, 
          '(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,32})', 
          'g'
        ) AS m
      LOOP
        handle_lower := rec.handle;
        
        INSERT INTO public.message_mentions (message_id, mentioned_user)
        SELECT NEW.id, p.id
        FROM public.profiles p
        WHERE lower(p.username::text) = handle_lower
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ╭─────────────────────────────────────────────────────────╮
-- │ 6. Triggers                                            │
-- ╰─────────────────────────────────────────────────────────╯

-- Trigger for new messages
DROP TRIGGER IF EXISTS trg_extract_mentions ON public.floq_messages;
CREATE TRIGGER trg_extract_mentions
  AFTER INSERT ON public.floq_messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.extract_mentions();

-- Trigger for message updates
DROP TRIGGER IF EXISTS trg_update_mentions ON public.floq_messages;
CREATE TRIGGER trg_update_mentions
  AFTER UPDATE OF body ON public.floq_messages
  FOR EACH ROW 
  EXECUTE FUNCTION public.extract_mentions_update();

-- ╭─────────────────────────────────────────────────────────╮
-- │ 7. Permissions                                         │
-- ╰─────────────────────────────────────────────────────────╯

-- Set function ownership to postgres
ALTER FUNCTION public.extract_mentions() OWNER TO postgres;
ALTER FUNCTION public.extract_mentions_update() OWNER TO postgres;

-- Grant table access to authenticated users
GRANT SELECT ON public.message_mentions TO authenticated;