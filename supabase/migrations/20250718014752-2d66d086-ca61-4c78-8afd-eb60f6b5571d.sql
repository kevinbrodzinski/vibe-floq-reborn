-- disable_ddl_transaction;
------------------------------------------------------------------------
--  1. Back-fill metadata in manageable batches (transaction-safe)
------------------------------------------------------------------------
DO $$
DECLARE
  _batch  INTEGER := 5_000;     -- tune for your workload
  _done   BOOLEAN;
  _updated INTEGER;
BEGIN
  LOOP
    WITH todo AS (
      SELECT id
      FROM   public.afterglow_moments
      WHERE  NOT (metadata ? 'location'
              AND metadata ? 'people'
              AND metadata ? 'vibe')
      LIMIT  _batch
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.afterglow_moments AS m
    SET    metadata =
             jsonb_build_object(
               'location',        COALESCE(m.metadata->'location', '{}'::jsonb),
               'people',          COALESCE(m.metadata->'people',
                                           '{"encountered_users":[],"total_people_count":0}'::jsonb),
               'vibe',            COALESCE(m.metadata->'vibe', '"neutral"'::jsonb),
               'social_context',  COALESCE(m.metadata->'social_context', '{}'::jsonb),
               'intensity',       COALESCE(m.metadata->'intensity', '0.5'::jsonb)
             )
             || COALESCE(m.metadata, '{}'::jsonb)
    FROM   todo
    WHERE  m.id = todo.id;

    GET DIAGNOSTICS _updated = ROW_COUNT;
    _done := (_updated = 0);
    EXIT WHEN _done;
  END LOOP;
END $$;

------------------------------------------------------------------------
--  2. Non-blocking indexes   (each owns its own txn)
------------------------------------------------------------------------
-- Fast containment/filtering on the raw JSONB column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_metadata_path_ops
  ON public.afterglow_moments
  USING gin (metadata jsonb_path_ops);

-- Location look-ups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_location_venue
  ON public.afterglow_moments
  USING gin ((metadata -> 'location' -> 'venue_id'));

-- Social context look-ups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_social_floq
  ON public.afterglow_moments
  USING gin ((metadata -> 'social_context' -> 'floq_id'));

------------------------------------------------------------------------
--  3. (Optional) ANALYZE          – safe in a migration
------------------------------------------------------------------------
ANALYZE public.afterglow_moments;