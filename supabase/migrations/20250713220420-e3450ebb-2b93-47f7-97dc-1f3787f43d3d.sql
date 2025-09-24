-- Phase 1: Extend flock_event_type_enum with new event types (idempotent)
-- Note: ADD VALUE cannot be run in a transaction block, so we use DO blocks

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ended'
      AND enumtypid = 'public.flock_event_type_enum'::regtype
  ) THEN
    ALTER TYPE public.flock_event_type_enum ADD VALUE 'ended';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'deleted'
      AND enumtypid = 'public.flock_event_type_enum'::regtype
  ) THEN
    ALTER TYPE public.flock_event_type_enum ADD VALUE 'deleted';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'boosted'
      AND enumtypid = 'public.flock_event_type_enum'::regtype
  ) THEN
    ALTER TYPE public.flock_event_type_enum ADD VALUE 'boosted';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'plan_created'
      AND enumtypid = 'public.flock_event_type_enum'::regtype
  ) THEN
    ALTER TYPE public.flock_event_type_enum ADD VALUE 'plan_created';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'invited'
      AND enumtypid = 'public.flock_event_type_enum'::regtype
  ) THEN
    ALTER TYPE public.flock_event_type_enum ADD VALUE 'invited';
  END IF;
END$$;

-- Phase 2: Enable full replica-identity for realtime diff streams
ALTER TABLE public.flock_history REPLICA IDENTITY FULL;

-- Phase 3: Attach to Supabase publication if not already (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'flock_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.flock_history;
  END IF;
END$$;