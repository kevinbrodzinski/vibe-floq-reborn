-- Enhanced RLS policies with safety guards and performance indexes

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

-- 2. Active public floqs (≥ 2 people) with NULL safety  
CREATE POLICY public_read_active_floqs
ON public.floqs
FOR SELECT
USING (
  COALESCE(visibility, 'private') = 'public'
  AND COALESCE(participants_count, 0) >= 2
);

-- 3. Performance indexes to match policy WHERE clauses
CREATE INDEX IF NOT EXISTS vibes_now_public_recent_ix
  ON public.vibes_now (updated_at DESC)
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS floqs_public_active_ix
  ON public.floqs (participants_count)
  WHERE visibility = 'public';