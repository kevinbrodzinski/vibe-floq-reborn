--──────────────────────────────────────────────────────────────────
--  fetch_floq_messages  – paged chat history, guarded by membership
--──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fetch_floq_messages(
  p_floq    uuid,                       -- required floq id
  p_before  timestamptz DEFAULT NULL,   -- cursor (messages older than)
  p_limit   integer      DEFAULT 20     -- page size
)
RETURNS TABLE (
  id          uuid,
  floq_id     uuid,
  sender_id   uuid,
  body        text,
  emoji       text,
  created_at  timestamptz,
  status      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim int := LEAST(COALESCE(p_limit, 20), 100);  -- safety-cap @100
BEGIN
  ------------------------------------------------------------------
  -- Guard: caller must belong to this floq
  ------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1
    FROM   public.floq_participants fp
    WHERE  fp.floq_id = p_floq
      AND  fp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'permission denied – not a member of this floq';
  END IF;

  ------------------------------------------------------------------
  -- Return newest → oldest page
  ------------------------------------------------------------------
  RETURN QUERY
  SELECT fm.id,
         fm.floq_id,
         fm.sender_id,
         fm.body,
         fm.emoji,
         fm.created_at,
         fm.status
  FROM   public.floq_messages fm
  WHERE  fm.floq_id = p_floq
    AND  (p_before IS NULL OR fm.created_at < p_before)
  ORDER  BY fm.created_at DESC
  LIMIT  lim;
END;
$$ STABLE;   -- depends only on args + table state

-- Make it callable by logged-in users
GRANT EXECUTE ON FUNCTION public.fetch_floq_messages(
  uuid, timestamptz, integer
) TO authenticated;