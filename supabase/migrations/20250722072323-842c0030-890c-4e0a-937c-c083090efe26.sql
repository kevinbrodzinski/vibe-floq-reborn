-- Fix RLS policies for floq_message_mentions to allow the trigger to work
-- The current INSERT policy blocks all writes, which prevents the trigger from working

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "fmm_no_write" ON public.floq_message_mentions;

-- Add a proper INSERT policy that allows the trigger to work
-- Since this table is only written by triggers and read by users, we need to allow:
-- 1. System/trigger inserts (no user context needed for triggers)
-- 2. User reads based on floq participation

CREATE POLICY "fmm_trigger_write" ON public.floq_message_mentions
FOR INSERT 
WITH CHECK (true);  -- Allow trigger inserts

-- Also update the read policy to be more explicit
DROP POLICY IF EXISTS "fmm_read" ON public.floq_message_mentions;

CREATE POLICY "fmm_read" ON public.floq_message_mentions
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM floq_messages m
    JOIN floq_participants fp ON fp.floq_id = m.floq_id
    WHERE m.id = floq_message_mentions.message_id 
    AND fp.user_id = auth.uid()
  )
);