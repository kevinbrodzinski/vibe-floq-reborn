-- Enhanced RLS policies with safety guards and performance indexes
-- Fixed to use actual column names

-- Ensure RLS is enabled
ALTER TABLE public.vibes_now ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to replace them
DROP POLICY IF EXISTS public_read_recent_vibes ON public.vibes_now;
DROP POLICY IF EXISTS public_read_active_floqs ON public.floqs;

-- 1. Recent public vibes (last 15 min) with NULL safety
CREATE POLICY public_read_recent_vibes
ON public.vibes_now
FOR SELECT
USING (
  COALESCE(visibility, 'private') = 'public'
  AND updated_at > now() - interval '15 minutes'
);

-- 2. Active public floqs (using visibility only since participants_count doesn't exist)
CREATE POLICY public_read_active_floqs
ON public.floqs
FOR SELECT
USING (
  COALESCE(visibility, 'private') = 'public'
);

-- 3. Performance indexes to match policy WHERE clauses
CREATE INDEX IF NOT EXISTS vibes_now_public_recent_ix
  ON public.vibes_now (updated_at DESC)
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS floqs_public_visibility_ix
  ON public.floqs (created_at DESC)
  WHERE visibility = 'public';