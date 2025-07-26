BEGIN;

-- Plan badge count RPC for server-side aggregation
CREATE OR REPLACE FUNCTION public.count_unseen_plan_events(uid uuid)
RETURNS TABLE (plan_id uuid, unseen int)
LANGUAGE sql
AS $$
  SELECT (payload->>'plan_id')::uuid,
         COUNT(*)::int
  FROM public.event_notifications
  WHERE user_id = uid
    AND seen_at IS NULL
    AND kind IN ('plan_comment_new','plan_checkin')
  GROUP BY (payload->>'plan_id');
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.count_unseen_plan_events(uuid) TO authenticated;

COMMIT;