BEGIN;

-- 1. Add the missing foreign-key
ALTER TABLE public.vibe_system_metrics
  ADD CONSTRAINT vibe_system_metrics_profile_fk
        FOREIGN KEY (profile_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;

-- 2. Add the enum check on measurement_type
ALTER TABLE public.vibe_system_metrics
  ADD CONSTRAINT vibe_system_metrics_measurement_type_ck
        CHECK (measurement_type IN ('accuracy',
                                    'performance',
                                    'learning',
                                    'system_health'));

-- 3. Enforce that metrics is a JSON object
ALTER TABLE public.vibe_system_metrics
  ADD CONSTRAINT vibe_system_metrics_metrics_json_ck
        CHECK (jsonb_typeof(metrics) = 'object');

-- 4. Turn on RLS & policy that was in the migration
ALTER TABLE public.vibe_system_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own metrics"
       ON public.vibe_system_metrics;

CREATE POLICY "Users can view their own metrics"
ON public.vibe_system_metrics
FOR SELECT
USING (profile_id IS NULL OR auth.uid() = profile_id);

-- 5. Add performance index
CREATE INDEX IF NOT EXISTS idx_vibe_system_metrics_type_time
  ON public.vibe_system_metrics (measurement_type, measured_at DESC);

COMMIT;