/* ---------------------------------------------------------- *
 *  1.  SNAP-TO-SUGGESTION  LOGS                              *
 * ---------------------------------------------------------- */

-- 1-a  Table
CREATE TABLE IF NOT EXISTS public.snap_suggestion_logs (
    id                UUID          PRIMARY KEY        DEFAULT gen_random_uuid(),
    user_id           UUID          NOT NULL           REFERENCES auth.users(id)          ON DELETE CASCADE,
    plan_id           UUID          NOT NULL           REFERENCES public.floq_plans(id)   ON DELETE CASCADE,
    stop_id           UUID                              REFERENCES public.plan_stops(id)  ON DELETE SET NULL,
    used_at           TIMESTAMPTZ   NOT NULL           DEFAULT NOW(),
    original_time     TEXT          NOT NULL,
    snapped_time      TEXT          NOT NULL,
    confidence        NUMERIC(5,2),                    -- e.g.  91.25
    reason            TEXT,
    source            TEXT          NOT NULL           DEFAULT 'nova'
);

-- 1-b  Recommended indexes
CREATE INDEX IF NOT EXISTS idx_snaplogs_user   ON public.snap_suggestion_logs (user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_snaplogs_plan   ON public.snap_suggestion_logs (plan_id, used_at DESC);

-- 1-c  RLS
ALTER TABLE public.snap_suggestion_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS snaplogs_user_ins  ON public.snap_suggestion_logs;
DROP POLICY IF EXISTS snaplogs_user_sel  ON public.snap_suggestion_logs;

-- INSERT
CREATE POLICY snaplogs_user_ins
    ON public.snap_suggestion_logs
    FOR INSERT
    WITH CHECK ( auth.uid() = user_id );

-- SELECT
CREATE POLICY snaplogs_user_sel
    ON public.snap_suggestion_logs
    FOR SELECT
    USING ( auth.uid() = user_id );

-- (No UPDATE / DELETE for now – keeps logs immutable)


/* ---------------------------------------------------------- *
 *  2.  USER PREFERENCES  FLAG                                *
 * ---------------------------------------------------------- */

-- Make sure the table exists in public schema
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'user_preferences'
  ) THEN
    RAISE EXCEPTION 'Table public.user_preferences does not exist';
  END IF;
END$$;

-- Add flag if missing
ALTER TABLE public.user_preferences
    ADD COLUMN IF NOT EXISTS prefer_smart_suggestions BOOLEAN NOT NULL DEFAULT TRUE;

-- Optional: index for quick look-ups
CREATE INDEX IF NOT EXISTS idx_userprefs_smart_suggestions
    ON public.user_preferences (prefer_smart_suggestions);


/* ---------------------------------------------------------- *
 *  3.  HELPER:  ENSURE RLS ENABLED ON floq_plans             *
 * ---------------------------------------------------------- */
ALTER TABLE public.floq_plans ENABLE ROW LEVEL SECURITY;

/* ---------------------------------------------------------- *
 *  4.  DONE                                                  *
 * ---------------------------------------------------------- */