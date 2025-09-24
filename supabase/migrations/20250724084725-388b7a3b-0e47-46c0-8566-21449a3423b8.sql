-- ───────────────────────────────────────────────────────────
-- 20250725_patch_finalize_plan_and_view.sql
-- Patches finalize_plan to ensure creator → plan_participants
-- Creates unified v_user_plans view for plans hub
-- ───────────────────────────────────────────────────────────

-- Check if finalize_plan exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_proc
    WHERE  proname = 'finalize_plan'
           AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'finalize_plan not found – run Phase-2 migration first';
  END IF;
END$$;

-- Patch finalize_plan to always ensure creator is in plan_participants
CREATE OR REPLACE FUNCTION public.finalize_plan(
  _plan_id    uuid,
  _selections jsonb,
  _creator    uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  s              jsonb;
  new_floq_id    uuid;
  target_floq_id uuid;
BEGIN
  ----------------------------------------------------------------
  -- 0 ▸ OWNERSHIP  (unchanged)
  ----------------------------------------------------------------
  IF NOT EXISTS (
      SELECT 1 FROM floq_plans
      WHERE id = _plan_id AND creator_id = _creator
  ) THEN
    RAISE EXCEPTION 'plan not found / not owned';
  END IF;

  ----------------------------------------------------------------
  -- 0-bis ▸ NEW LINE  ➜ ensure creator has row in plan_participants
  ----------------------------------------------------------------
  INSERT INTO plan_participants(plan_id, user_id, role)
  VALUES (_plan_id, _creator, 'creator')
  ON CONFLICT (plan_id, user_id) DO NOTHING;

  ----------------------------------------------------------------
  -- 1 ▸ SOLO  (original logic unchanged)
  ----------------------------------------------------------------
  IF jsonb_array_length(_selections) = 0 THEN
    UPDATE floq_plans
       SET plan_mode = 'finalized'
     WHERE id = _plan_id;

    RETURN jsonb_build_object('success', TRUE, 'kind', 'solo');
  END IF;

  ----------------------------------------------------------------
  -- 2 ▸ ONE EXISTING FLOQ, NO INVITES
  ----------------------------------------------------------------
  IF jsonb_array_length(_selections) = 1
     AND (_selections->0->>'type') = 'existing' THEN
     target_floq_id := (_selections->0->>'floqId')::UUID;

     INSERT INTO plan_floqs(plan_id, floq_id, auto_disband)
     VALUES (_plan_id, target_floq_id, FALSE)
     ON CONFLICT DO NOTHING;

     UPDATE floq_plans
       SET floq_id   = target_floq_id,
           plan_mode = 'finalized'
     WHERE id = _plan_id;

     RETURN jsonb_build_object(
       'success', TRUE,
       'kind',    'existing',
       'floq_id', target_floq_id
     );
  END IF;

  ----------------------------------------------------------------
  -- 3 ▸ SUPER FLOQ
  ----------------------------------------------------------------
  INSERT INTO floqs(
      creator_id, title, visibility,
      primary_vibe, type,  auto_created, location
  ) VALUES (
      _creator,
      concat_ws(' ', (SELECT title FROM floq_plans WHERE id = _plan_id), 'Group'),
      'private',
      COALESCE((SELECT vibe_tag FROM floq_plans WHERE id = _plan_id)::vibe_enum, 'chill'),
      'plan-combined',
      TRUE,
      NULL
  ) RETURNING id INTO target_floq_id;

  INSERT INTO floq_participants(floq_id, user_id, role)
  VALUES (target_floq_id, _creator, 'creator')
  ON CONFLICT (floq_id, user_id) DO NOTHING;

  -- 3a ▸ iterate selections
  FOR s IN SELECT * FROM jsonb_array_elements(_selections)
  LOOP
    IF s->>'type' = 'new' THEN
      INSERT INTO floqs(
          creator_id, title, visibility,
          primary_vibe, type, auto_created, location
      ) VALUES (
          _creator,
          s->>'name',
          'private',
          COALESCE((SELECT vibe_tag FROM floq_plans WHERE id = _plan_id)::vibe_enum, 'chill'),
          'plan-sub',
          TRUE,
          NULL
      ) RETURNING id INTO new_floq_id;

      INSERT INTO floq_participants(floq_id, user_id, role)
      VALUES (new_floq_id, _creator, 'creator')
      ON CONFLICT (floq_id, user_id) DO NOTHING;

      INSERT INTO plan_floqs(plan_id, floq_id, auto_disband)
      VALUES (_plan_id, new_floq_id, (s->>'autoDisband')::BOOLEAN);

    ELSE
      -- existing floq
      INSERT INTO plan_floqs(plan_id, floq_id, auto_disband)
      VALUES (_plan_id,
              (s->>'floqId')::UUID,
              (s->>'autoDisband')::BOOLEAN)
      ON CONFLICT DO NOTHING;

      -- merge members
      INSERT INTO floq_participants(floq_id, user_id, role)
      SELECT target_floq_id, fp.user_id, 'member'
      FROM   floq_participants fp
      WHERE  fp.floq_id = (s->>'floqId')::UUID
        AND  fp.user_id <> _creator
      ON CONFLICT (floq_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  UPDATE floq_plans
    SET floq_id   = target_floq_id,
        plan_mode = 'finalized'
  WHERE id = _plan_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'kind',    'combined',
    'floq_id', target_floq_id
  );
END;
$func$;

-- Create unified view for user plans
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
  b.plan_mode,                     -- also keep plan_mode
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