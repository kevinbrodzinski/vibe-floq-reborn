-- Add missing columns to plan_share_links table
ALTER TABLE public.plan_share_links 
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_plan_share_links_last_accessed 
ON public.plan_share_links (last_accessed_at DESC);

-- Update RLS policy to allow tracking updates
CREATE POLICY "plan_share_links_system_update" 
ON public.plan_share_links 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Make sure we have the correct slug generation function
CREATE OR REPLACE FUNCTION public.gen_plan_share_slug()
RETURNS text 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN string_agg(
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
           (floor(random()*36)+1)::int, 1),
    ''
  )
  FROM generate_series(1,8);
END;
$$;