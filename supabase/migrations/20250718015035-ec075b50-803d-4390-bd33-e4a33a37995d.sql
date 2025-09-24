/*---------------------------------------------------------------
  Back-fill metadata in batches
----------------------------------------------------------------*/
DO $$
DECLARE
  _batch INT := 5_000;
  _done  BOOLEAN;
  _updated INT;
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
               'vibe',            COALESCE(m.metadata->'vibe', '"neutral"'),
               'social_context',  COALESCE(m.metadata->'social_context', '{}'::jsonb),
               'intensity',       COALESCE(m.metadata->'intensity', 0.5)
             )
             || COALESCE(m.metadata, '{}'::jsonb)
    FROM   todo
    WHERE  m.id = todo.id;

    GET DIAGNOSTICS _updated = ROW_COUNT;
    _done := (_updated = 0);
    EXIT WHEN _done;
  END LOOP;
END $$;

ANALYZE public.afterglow_moments;