-- ==============================================
-- Fix trigger function and implement reactions system
-- ==============================================

-- Step 1: Fix the trigger function to use NEW.profile_id instead of NEW.sender_id
CREATE OR REPLACE FUNCTION public.bump_dm_thread()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Bump last_message_at and increment unread for the *other* member.
  UPDATE public.direct_threads
  SET
    last_message_at = COALESCE(NEW.created_at, now()),
    unread_a = CASE
                 WHEN NEW.profile_id = member_a_profile_id THEN unread_a
                 ELSE unread_a + 1
               END,
    unread_b = CASE
                 WHEN NEW.profile_id = member_b_profile_id THEN unread_b
                 ELSE unread_b + 1
               END
  WHERE id = NEW.thread_id;

  RETURN NEW;
END
$$;

-- Step 2: Clean up old triggers and functions
DROP TRIGGER IF EXISTS trg_bump_thread ON public.direct_messages;
DROP FUNCTION IF EXISTS public.trg_bump_unreads();
DROP TRIGGER IF EXISTS trg_dm_bump ON public.direct_messages;
DROP TRIGGER IF EXISTS trg_bump_dm_thread ON public.direct_messages;
DROP TRIGGER IF EXISTS trg_bump_unread ON public.direct_messages;
DROP FUNCTION IF EXISTS public.bump_dm_unread();

-- Step 3: Create the single canonical trigger
CREATE TRIGGER trg_dm_bump
AFTER INSERT ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.bump_dm_thread();

-- Step 4: Create reactions table (using direct_message_reactions as specified)
CREATE TABLE IF NOT EXISTS public.direct_message_reactions (
  message_id   uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES public.profiles(id)        ON DELETE CASCADE,
  emoji        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, profile_id, emoji)
);

-- Step 5: Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_dmr_msg   ON public.direct_message_reactions (message_id);
CREATE INDEX IF NOT EXISTS idx_dmr_emoji ON public.direct_message_reactions (emoji);

-- Step 6: Enable RLS and create policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'direct_message_reactions'
  ) THEN
    ALTER TABLE public.direct_message_reactions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY dmr_select_own
      ON public.direct_message_reactions
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.direct_messages m
          JOIN public.direct_threads t ON t.id = m.thread_id
          WHERE m.id = direct_message_reactions.message_id
            AND (t.member_a_profile_id = auth.uid() OR t.member_b_profile_id = auth.uid())
        )
      );

    CREATE POLICY dmr_insert_self
      ON public.direct_message_reactions
      FOR INSERT TO authenticated
      WITH CHECK (profile_id = auth.uid());

    CREATE POLICY dmr_delete_self
      ON public.direct_message_reactions
      FOR DELETE TO authenticated
      USING (profile_id = auth.uid());
  END IF;
END $$;

-- Step 7: Create the expanded view for messages with replies and reactions
CREATE OR REPLACE VIEW public.v_dm_messages_expanded AS
SELECT
  m.id,
  m.thread_id,
  m.profile_id,
  m.content,
  m.created_at,
  m.reply_to,                                  -- uuid (can be null)

  -- reply preview (nulls if no reply_to)
  CASE 
    WHEN m.reply_to IS NOT NULL THEN
      jsonb_build_object(
        'id',         r.id,
        'content',    r.content,
        'created_at', r.created_at,
        'profile_id', r.profile_id
      )
    ELSE NULL
  END AS reply_to_msg,

  -- reactions aggregated as array of {emoji, count, reactors: [uuid]}
  COALESCE(
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'emoji',  grp.emoji,
                 'count',  grp.cnt,
                 'reactors', grp.react_ids
               )
               ORDER BY grp.cnt DESC, grp.emoji
             )
      FROM (
        SELECT
          dmr.emoji,
          COUNT(*)::int AS cnt,
          jsonb_agg(dmr.profile_id ORDER BY dmr.profile_id) AS react_ids
        FROM public.direct_message_reactions dmr
        WHERE dmr.message_id = m.id
        GROUP BY dmr.emoji
      ) AS grp
    ),
    '[]'::jsonb
  ) AS reactions
FROM public.direct_messages m
LEFT JOIN public.direct_messages r
  ON r.id = m.reply_to;

-- Step 8: Grant permissions
GRANT SELECT ON public.v_dm_messages_expanded TO authenticated;
GRANT ALL ON public.direct_message_reactions TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';