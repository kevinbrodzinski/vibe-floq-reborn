-- Add optimized index for fast real-time lookup per stop
CREATE INDEX IF NOT EXISTS idx_checkins_stop_user ON public.plan_check_ins(stop_id, user_id);

-- Add optional columns for future proximity logic
ALTER TABLE public.plan_check_ins 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS geo_hash TEXT;