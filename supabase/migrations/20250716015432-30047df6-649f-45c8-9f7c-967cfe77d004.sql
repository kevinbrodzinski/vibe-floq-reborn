-- Update afterglow_moments table to match exact specification
DROP TABLE IF EXISTS public.afterglow_moments CASCADE;

CREATE TABLE IF NOT EXISTS public.afterglow_moments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_afterglow_id uuid NOT NULL
    REFERENCES public.daily_afterglow(id) ON DELETE CASCADE,

  moment_type       afterglow_moment_type NOT NULL,
  timestamp         timestamptz           NOT NULL,
  title             text                  NOT NULL,
  description       text,
  color             text,
  metadata          jsonb                 DEFAULT '{}'::jsonb,

  created_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afterglow_moments_day
  ON public.afterglow_moments (daily_afterglow_id, timestamp);

-- Enable RLS (maintaining existing security model)
ALTER TABLE public.afterglow_moments ENABLE ROW LEVEL SECURITY;

CREATE POLICY afterglow_moments_owner
ON public.afterglow_moments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.daily_afterglow da
    WHERE da.id = afterglow_moments.daily_afterglow_id
      AND da.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.daily_afterglow da
    WHERE da.id = afterglow_moments.daily_afterglow_id
      AND da.user_id = auth.uid()
  )
);