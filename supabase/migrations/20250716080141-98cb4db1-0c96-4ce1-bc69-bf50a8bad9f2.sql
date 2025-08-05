-- Add default timestamp for ai_summary_generated_at (optional polish)
ALTER TABLE public.daily_afterglow 
  ALTER COLUMN ai_summary_generated_at SET DEFAULT now();