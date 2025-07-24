-- Phase 2: Finalization Flow
-- Create unique index for plan_floqs
CREATE UNIQUE INDEX IF NOT EXISTS plan_floqs_uniq
  ON public.plan_floqs(plan_id, floq_id);

-- Add auto_disband column if not exists
ALTER TABLE public.plan_floqs
  ADD COLUMN IF NOT EXISTS auto_disband boolean NOT NULL DEFAULT false;

-- Index for archived floqs
CREATE INDEX IF NOT EXISTS idx_floqs_archived_at
  ON public.floqs(archived_at);

-- Create finalize_plan RPC function
CREATE OR REPLACE FUNCTION public.finalize_plan(
  _plan_id     uuid,
  _selections  jsonb,
  _creator     uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  s              jsonb;
  new_floq_id    uuid;
  target_floq_id uuid;
BEGIN
  ----------------------------------------------------------------
  -- 0.  Sanity-check ownership
  ----------------------------------------------------------------
  IF NOT EXISTS (
      SELECT 1 FROM floq_plans
      WHERE id = _plan_id AND creator_id = _creator
  ) THEN
    RAISE EXCEPTION 'plan not found / not owned';
  END IF;

  ----------------------------------------------------------------
  -- 1.  Solo plan  (no selections at all)
  ----------------------------------------------------------------
  IF jsonb_array_length(_selections) = 0 THEN
    UPDATE floq_plans
      SET plan_mode = 'finalized'
    WHERE id = _plan_id;

    RETURN jsonb_build_object(
      'success', true,
      'kind',    'solo'
    );
  END IF;

  ----------------------------------------------------------------
  -- 2.  Single existing Floq
  ----------------------------------------------------------------
  IF jsonb_array_length(_selections) = 1
     AND (_selections->0->>'type') = 'existing' THEN

     target_floq_id := (_selections->0->>'floqId')::uuid;

     INSERT INTO plan_floqs(plan_id, floq_id, auto_disband)
     VALUES (_plan_id, target_floq_id, false)
     ON CONFLICT DO NOTHING;

     UPDATE floq_plans
       SET floq_id   = target_floq_id,
           plan_mode = 'finalized'
     WHERE id = _plan_id;

     RETURN jsonb_build_object(
       'success', true,
       'kind',    'existing',
       'floq_id', target_floq_id
     );
  END IF;

  ----------------------------------------------------------------
  -- 3.  Super-floq flow (≥1 new OR ≥2 existing)
  ----------------------------------------------------------------
  INSERT INTO floqs(
      creator_id,
      title,
      visibility,
      primary_vibe,
      type,
      auto_created,
      location
  )
  VALUES(
      _creator,
      concat_ws(' ', (SELECT title FROM floq_plans WHERE id = _plan_id), 'Group'),
      'private',
      COALESCE((SELECT vibe_tag FROM floq_plans WHERE id = _plan_id)::vibe_enum, 'chill'),
      'plan-combined',
      true,
      ST_SetSRID(ST_MakePoint(0, 0), 4326) -- default location
  )
  RETURNING id INTO target_floq_id;

  -- add creator
  INSERT INTO floq_participants(floq_id, user_id, role)
  VALUES(target_floq_id, _creator, 'creator');

  ----------------------------------------------------------------
  -- 3a. iterate through selections
  ----------------------------------------------------------------
  FOR s IN SELECT * FROM jsonb_array_elements(_selections)
  LOOP
    IF s->>'type' = 'new' THEN
       INSERT INTO floqs(
           creator_id, title, visibility,
           primary_vibe, type, auto_created, location
       )
       VALUES(
           _creator,
           s->>'name',
           'private',
           COALESCE((SELECT vibe_tag FROM floq_plans WHERE id = _plan_id)::vibe_enum, 'chill'),
           'plan-sub',
           true,
           ST_SetSRID(ST_MakePoint(0, 0), 4326) -- default location
       )
       RETURNING id INTO new_floq_id;

       INSERT INTO floq_participants(floq_id, user_id, role)
       VALUES(new_floq_id, _creator, 'creator');

       INSERT INTO plan_floqs(plan_id, floq_id, auto_disband)
       VALUES(_plan_id, new_floq_id, (s->>'autoDisband')::boolean);

    ELSE
       -- existing
       INSERT INTO plan_floqs(plan_id, floq_id, auto_disband)
       VALUES(
         _plan_id,
         (s->>'floqId')::uuid,
         (s->>'autoDisband')::boolean
       )
       ON CONFLICT DO NOTHING;

       -- merge members into combined floq
       INSERT INTO floq_participants (floq_id, user_id, role)
       SELECT target_floq_id, fp.user_id, 'member'
       FROM floq_participants fp
       WHERE fp.floq_id = (s->>'floqId')::uuid
         AND fp.user_id <> _creator
       ON CONFLICT (floq_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  ----------------------------------------------------------------
  -- 4.  mark plan finalized + link to combined floq
  ----------------------------------------------------------------
  UPDATE floq_plans
    SET floq_id   = target_floq_id,
        plan_mode = 'finalized'
  WHERE id = _plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'kind',    'combined',
    'floq_id', target_floq_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_plan(uuid, jsonb, uuid)
TO authenticated;