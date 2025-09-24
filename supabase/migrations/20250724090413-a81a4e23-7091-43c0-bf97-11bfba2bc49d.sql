-- Fix v_user_plans view to alias plan_mode as status for frontend compatibility
CREATE OR REPLACE VIEW public.v_user_plans AS
WITH base AS (
  SELECT fp.*
  FROM   public.floq_plans fp
  WHERE  fp.archived_at IS NULL
    -- creator sees own plans even if no participants yet
    AND ( fp.creator_id = auth.uid()
          OR EXISTS (SELECT 1
                       FROM public.plan_participants pp
                      WHERE pp.plan_id = fp.id
                        AND pp.user_id = auth.uid())
          OR EXISTS (SELECT 1
                       FROM public.plan_floqs pf
                       JOIN public.floq_participants fpart
                         ON fpart.floq_id = pf.floq_id
                      WHERE pf.plan_id = fp.id
                        AND fpart.user_id = auth.uid())
        )
)
SELECT
  b.id,
  b.title,
  b.planned_at,
  b.plan_mode AS status,           -- alias for frontend compatibility
  b.vibe_tag,
  b.archived_at,
  b.current_stop_id,
  b.execution_started_at,
  COALESCE(pp.participant_count, 0) AS participant_count,
  COALESCE(ps.stops_count,       0) AS stops_count
FROM base b
LEFT JOIN LATERAL (
      SELECT COUNT(*) AS participant_count
      FROM   public.plan_participants pp
      WHERE  pp.plan_id = b.id
) pp ON TRUE
LEFT JOIN LATERAL (
      SELECT COUNT(*) AS stops_count
      FROM   public.plan_stops ps
      WHERE  ps.plan_id = b.id
) ps ON TRUE
ORDER BY b.planned_at DESC NULLS LAST;