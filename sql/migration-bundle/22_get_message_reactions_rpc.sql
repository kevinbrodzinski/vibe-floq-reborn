BEGIN;

-- Server-side reaction aggregation function
CREATE OR REPLACE FUNCTION public.get_message_reactions(ids uuid[])
RETURNS TABLE (message_id uuid, emoji text, cnt int)
LANGUAGE sql
STABLE AS $$
  SELECT message_id, emoji, COUNT(*)::int AS cnt
  FROM public.floq_message_reactions
  WHERE message_id = ANY(ids)
  GROUP BY message_id, emoji;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.get_message_reactions(uuid[]) TO authenticated;

COMMIT;