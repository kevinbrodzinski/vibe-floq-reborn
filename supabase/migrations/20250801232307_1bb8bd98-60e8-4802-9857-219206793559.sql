-- Clean up self-conversation threads in direct messages
-- Remove any threads where member_a = member_b (same user talking to themselves)

DELETE FROM public.direct_messages 
WHERE thread_id IN (
  SELECT id FROM public.direct_threads 
  WHERE member_a = member_b
);

DELETE FROM public.direct_threads 
WHERE member_a = member_b;