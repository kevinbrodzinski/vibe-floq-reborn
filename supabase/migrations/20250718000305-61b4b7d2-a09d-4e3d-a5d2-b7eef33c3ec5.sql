-- Add CHECK constraint to ensure week_ending is always Sunday
ALTER TABLE public.weekly_ai_suggestions
  ADD CONSTRAINT week_on_sunday
  CHECK (
    extract(dow from week_ending) = 0  -- 0 = Sunday
  );

-- Simple index without date function to avoid immutability issues
CREATE INDEX IF NOT EXISTS weekly_ai_suggestions_latest
  ON public.weekly_ai_suggestions (user_id, week_ending DESC);