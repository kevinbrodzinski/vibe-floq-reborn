--───────────────────────────────────────────────────────────────────────────────
--  Floq chat: realtime + performance tweaks   (fixed pubname column)
--───────────────────────────────────────────────────────────────────────────────
DO
$$
DECLARE
  already_pub BOOLEAN := EXISTS (
    SELECT
    FROM   pg_publication_tables
    WHERE  pubname     = 'supabase_realtime'   -- ← fixed column name
      AND  schemaname  = 'public'
      AND  tablename   = 'floq_messages'
  );




  col_exists BOOLEAN := EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'floq_messages'
      AND  column_name  = 'status'
  );
BEGIN
  ---------------------------------------------------------------------------
  -- 1.  Replica-identity for UPDATE/DELETE payloads
  ---------------------------------------------------------------------------
  EXECUTE 'ALTER TABLE public.floq_messages REPLICA IDENTITY FULL';




  ---------------------------------------------------------------------------
  -- 2.  Add to supabase_realtime publication (idempotent)
  ---------------------------------------------------------------------------
  IF NOT already_pub THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.floq_messages';
  END IF;




  ---------------------------------------------------------------------------
  -- 3.  Performance indexes (idempotent via IF NOT EXISTS)
  ---------------------------------------------------------------------------
  EXECUTE '
    CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_created
      ON public.floq_messages (floq_id, created_at DESC)';




  EXECUTE '
    CREATE INDEX IF NOT EXISTS idx_floq_messages_sender
      ON public.floq_messages (sender_id)';




  ---------------------------------------------------------------------------
  -- 4.  Delivery-status column (sending|sent|failed)
  ---------------------------------------------------------------------------
  IF NOT col_exists THEN
    EXECUTE '
      ALTER TABLE public.floq_messages
        ADD COLUMN status text
          DEFAULT ''sent''
          CHECK (status IN (''sending'', ''sent'', ''failed''))';
  END IF;
END
$$;