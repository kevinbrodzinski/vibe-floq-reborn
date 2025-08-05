-- 1️⃣   Bypass RLS just for this statement
ALTER TABLE public.snap_suggestion_logs DISABLE ROW LEVEL SECURITY;

-- 2️⃣   Back-fill null timestamps (wrapped in a quick transaction)
BEGIN;
  UPDATE public.snap_suggestion_logs
  SET    used_at = now()
  WHERE  used_at IS NULL;
COMMIT;

-- 3️⃣   Re-enable RLS
ALTER TABLE public.snap_suggestion_logs ENABLE ROW LEVEL SECURITY;