-- Enable RLS on dm_message_reactions table
ALTER TABLE public.dm_message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see reactions on messages in threads they're part of
CREATE POLICY "Users can view reactions on accessible messages" 
ON public.dm_message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = dm_message_reactions.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- Policy: Users can add reactions to messages in threads they're part of
CREATE POLICY "Users can add reactions to accessible messages" 
ON public.dm_message_reactions FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = dm_message_reactions.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- Policy: Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions" 
ON public.dm_message_reactions FOR DELETE
USING (
  profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = dm_message_reactions.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- Enable RLS on dm_media table
ALTER TABLE public.dm_media ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see media in threads they're part of
CREATE POLICY "Users can view media in accessible threads" 
ON public.dm_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_threads dt
    WHERE dt.id = dm_media.thread_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- Policy: Users can upload media to threads they're part of
CREATE POLICY "Users can upload media to accessible threads" 
ON public.dm_media FOR INSERT
WITH CHECK (
  uploader_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.direct_threads dt
    WHERE dt.id = dm_media.thread_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- Policy: Users can update their own media uploads
CREATE POLICY "Users can update their own media uploads" 
ON public.dm_media FOR UPDATE
USING (uploader_profile_id = auth.uid())
WITH CHECK (uploader_profile_id = auth.uid());

-- Policy: Users can delete their own media uploads
CREATE POLICY "Users can delete their own media uploads" 
ON public.dm_media FOR DELETE
USING (uploader_profile_id = auth.uid());

-- Grant access to the reaction summary view
GRANT SELECT ON public.v_dm_message_reactions_summary TO authenticated;

-- Create policy for the view (inherited from base table policies)
CREATE POLICY "Users can view reaction summaries for accessible messages"
ON public.v_dm_message_reactions_summary FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.direct_messages dm
    JOIN public.direct_threads dt ON dt.id = dm.thread_id
    WHERE dm.id = v_dm_message_reactions_summary.message_id
    AND (dt.member_a = auth.uid() OR dt.member_b = auth.uid())
  )
);

-- Add comments for documentation
COMMENT ON POLICY "Users can view reactions on accessible messages" ON public.dm_message_reactions IS 
'Allow users to see message reactions in DM threads they participate in';

COMMENT ON POLICY "Users can add reactions to accessible messages" ON public.dm_message_reactions IS 
'Allow users to add reactions to messages in DM threads they participate in';

COMMENT ON POLICY "Users can remove their own reactions" ON public.dm_message_reactions IS 
'Allow users to remove their own message reactions';

COMMENT ON POLICY "Users can view media in accessible threads" ON public.dm_media IS 
'Allow users to view media in DM threads they participate in';

COMMENT ON POLICY "Users can upload media to accessible threads" ON public.dm_media IS 
'Allow users to upload media to DM threads they participate in';

COMMENT ON POLICY "Users can update their own media uploads" ON public.dm_media IS 
'Allow users to update metadata for their own media uploads';

COMMENT ON POLICY "Users can delete their own media uploads" ON public.dm_media IS 
'Allow users to delete their own media uploads';