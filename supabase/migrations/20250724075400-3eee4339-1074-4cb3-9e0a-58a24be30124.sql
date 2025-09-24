-- ────────────────────────────────────────────────────────────
-- 1. plan_floqs housekeeping
-- ────────────────────────────────────────────────────────────
-- 1a.  unique (plan_id, floq_id)
CREATE UNIQUE INDEX IF NOT EXISTS plan_floqs_uniq
    ON public.plan_floqs (plan_id, floq_id);

-- 1b.  auto_disband flag (default FALSE)
ALTER TABLE public.plan_floqs
  ADD COLUMN IF NOT EXISTS auto_disband BOOLEAN NOT NULL DEFAULT FALSE;



-- ────────────────────────────────────────────────────────────
-- 2. floqs housekeeping
-- ────────────────────────────────────────────────────────────
-- 2a.  allow "archived" look-ups
CREATE INDEX IF NOT EXISTS idx_floqs_archived_at
    ON public.floqs (archived_at);

-- 2b.  make location OPTIONAL (some clouds lack PostGIS SRID 4326)
ALTER TABLE public.floqs
  ALTER COLUMN location DROP NOT NULL,
  ALTER COLUMN location SET DEFAULT NULL;

-- 2c.  optional CHECK for the plain-text `type` column (including existing 'auto' type)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_floqs_type'
  ) THEN
    ALTER TABLE public.floqs
      ADD CONSTRAINT chk_floqs_type
      CHECK (type IN ('auto', 'plan-combined','plan-sub','plan-origin'));
  END IF;
END$$;



-- ────────────────────────────────────────────────────────────
-- 3. RPC  finalise_plan (replaces old edge function)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.finalize_plan(
  _plan_id     UUID,
  _selections  JSONB,
  _creator     UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  s              JSONB;
  new_floq_id    UUID;
  target_floq_id UUID;
BEGIN
  -- 0 ▸ OWNERSHIP
  IF NOT EXISTS (
      SELECT 1 FROM floq_plans
      WHERE id = _plan_id AND creator_id = _creator
  ) THEN
    RAISE EXCEPTION 'plan not found / not owned';
  END IF;

  -- 1 ▸ SOLO
  IF jsonb_array_length(_selections) = 0 THEN
    UPDATE floq_plans
      SET plan_mode = 'finalized'
    WHERE id = _plan_id;

    RETURN jsonb_build_object('success', TRUE, 'kind', 'solo');
  END IF;

  -- 2 ▸ ONE EXISTING FLOQ, NO INVITES
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

  -- 3 ▸ SUPER FLOQ
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
      NULL      -- nullable after step 2b
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
$$;

GRANT EXECUTE ON FUNCTION public.finalize_plan(UUID, JSONB, UUID)
TO authenticated;