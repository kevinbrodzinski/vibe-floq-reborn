-- 0. prerequisites
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. table
CREATE TABLE IF NOT EXISTS public.plan_transit_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  from_stop_id uuid NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  to_stop_id   uuid NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  transit_data jsonb NOT NULL,
  duration_seconds integer,
  distance_meters integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, from_stop_id, to_stop_id)
);

-- 2. auto-touch trigger
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER touch_transit_updated
BEFORE UPDATE ON public.plan_transit_cache
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- 3. indexes
CREATE INDEX IF NOT EXISTS idx_transit_cache_plan_id      ON public.plan_transit_cache(plan_id);
CREATE INDEX IF NOT EXISTS idx_transit_cache_updated      ON public.plan_transit_cache(updated_at);

-- 4. RLS
ALTER TABLE public.plan_transit_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transit cache read"
ON public.plan_transit_cache
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.plan_participants pp
          WHERE pp.plan_id = plan_transit_cache.plan_id
            AND pp.user_id = auth.uid())
  OR
  EXISTS (SELECT 1 FROM public.floq_plans fp
          JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
          WHERE fp.id = plan_transit_cache.plan_id
            AND fpar.user_id = auth.uid())
);

CREATE POLICY "Transit cache write"
ON public.plan_transit_cache
FOR INSERT WITH CHECK (user_can_manage_plan(plan_id));

CREATE POLICY "Transit cache update"
ON public.plan_transit_cache
FOR UPDATE USING (user_can_manage_plan(plan_id));

-- 5. cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_transit_cache()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE deleted integer;
BEGIN
  DELETE FROM public.plan_transit_cache
  WHERE updated_at < now() - interval '24 hours';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_transit_cache() TO authenticated;