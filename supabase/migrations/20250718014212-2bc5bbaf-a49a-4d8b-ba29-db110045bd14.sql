/*───────────────────────────────────────────────────────────────
  1. Back-fill metadata (batched to avoid long locks)
───────────────────────────────────────────────────────────────*/
DO $$
DECLARE
  _batch  INT    := 5_000;   -- tune for your workload
  _done   BOOLEAN;
BEGIN
  LOOP
    WITH todo AS (
      SELECT id
      FROM   public.afterglow_moments
      WHERE  NOT (metadata ? 'location' AND metadata ? 'people' AND metadata ? 'vibe')
      LIMIT  _batch
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.afterglow_moments m
    SET    metadata = jsonb_build_object(
             'location',        COALESCE(m.metadata->'location', '{}'::jsonb),
             'people',          COALESCE(m.metadata->'people',
                                         '{"encountered_users": [], "total_people_count": 0}'::jsonb),
             'vibe',            COALESCE(m.metadata->'vibe', '"neutral"'),
             'social_context',  COALESCE(m.metadata->'social_context', '{}'::jsonb),
             'intensity',       COALESCE(m.metadata->'intensity', 0.5)
           ) || COALESCE(m.metadata, '{}'::jsonb)
    FROM   todo
    WHERE  m.id = todo.id;

    GET DIAGNOSTICS _done = ROW_COUNT = 0;
    EXIT WHEN _done;
  END LOOP;
END $$;


/*───────────────────────────────────────────────────────────────
  2. Indexes (built CONCURRENTLY to avoid blocking traffic)
───────────────────────────────────────────────────────────────*/
-- Raw-column path_ops index (fast containment queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_metadata_path_ops
  ON public.afterglow_moments
  USING gin (metadata jsonb_path_ops);

-- Expression indexes use default GIN opclass
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_location_venue
  ON public.afterglow_moments
  USING gin ((metadata -> 'location' -> 'venue_id'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_moments_social_floq
  ON public.afterglow_moments
  USING gin ((metadata -> 'social_context' -> 'floq_id'));


/*───────────────────────────────────────────────────────────────
  3. House-keeping
───────────────────────────────────────────────────────────────*/
VACUUM ANALYZE public.afterglow_moments;