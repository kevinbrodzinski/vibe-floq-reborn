-- ==============================================
-- Complete messaging system with replies and reactions
-- ==============================================

-- 1. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dm_reply_to ON public.direct_messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_dm_react_msg ON public.dm_message_reactions(message_id);

-- 2. Create comprehensive view for messages with replies and reactions
CREATE OR REPLACE VIEW public.v_dm_messages AS
SELECT
  m.id,
  m.thread_id,
  m.profile_id,
  m.content,
  m.created_at,
  m.message_type,
  m.status,
  m.reply_to,

  -- Parent message (inline reply preview)
  CASE 
    WHEN m.reply_to IS NOT NULL THEN
      jsonb_build_object(
        'id', p.id,
        'profile_id', p.profile_id,
        'content', p.content,
        'created_at', p.created_at
      )
    ELSE NULL
  END as reply_to_msg,

  -- Reactions aggregated
  COALESCE(r.reactions, '[]'::jsonb) as reactions

FROM public.direct_messages m
LEFT JOIN public.direct_messages p ON p.id = m.reply_to
LEFT JOIN LATERAL (
  SELECT jsonb_agg(
           jsonb_build_object(
             'emoji', react.emoji,
             'count', count(*)
           )
           ORDER BY react.emoji
         ) as reactions
  FROM public.dm_message_reactions react
  WHERE react.message_id = m.id
  GROUP BY react.message_id
) r ON true;

-- 3. RLS policies for direct_messages
CREATE POLICY IF NOT EXISTS pol_dm_messages_select
ON public.direct_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.direct_threads dt
    WHERE dt.id = direct_messages.thread_id
      AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
  )
);

-- 4. RLS policies for dm_message_reactions
CREATE POLICY IF NOT EXISTS pol_dm_reactions_select
ON public.dm_message_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.direct_messages m
    JOIN public.direct_threads dt ON dt.id = m.thread_id
    WHERE m.id = dm_message_reactions.message_id
      AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
  )
);

-- 5. Allow users to insert reactions on their own messages and messages in threads they're part of
CREATE POLICY IF NOT EXISTS pol_dm_reactions_insert
ON public.dm_message_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid() AND
  EXISTS (
    SELECT 1
    FROM public.direct_messages m
    JOIN public.direct_threads dt ON dt.id = m.thread_id
    WHERE m.id = dm_message_reactions.message_id
      AND (dt.member_a_profile_id = auth.uid() OR dt.member_b_profile_id = auth.uid())
  )
);

-- 6. Allow users to delete their own reactions
CREATE POLICY IF NOT EXISTS pol_dm_reactions_delete
ON public.dm_message_reactions
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- 7. Enable RLS on tables if not already enabled
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;

-- 8. Grant permissions on the view
GRANT SELECT ON public.v_dm_messages TO authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';