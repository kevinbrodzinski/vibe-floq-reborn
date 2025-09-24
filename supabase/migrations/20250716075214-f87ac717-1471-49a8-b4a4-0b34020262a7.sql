-- Add AI summary column to daily_afterglow table
ALTER TABLE public.daily_afterglow 
ADD COLUMN ai_summary text,
ADD COLUMN ai_summary_generated_at timestamptz;