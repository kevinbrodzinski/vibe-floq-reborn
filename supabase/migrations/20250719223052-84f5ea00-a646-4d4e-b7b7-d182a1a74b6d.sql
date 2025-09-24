-- Create plan share links table for deep linking and referral tracking
CREATE TABLE IF NOT EXISTS public.plan_share_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  click_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.plan_share_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for plan share links
CREATE POLICY "plan_share_links_creator_full" ON public.plan_share_links
  FOR ALL USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.floq_plans fp
      WHERE fp.id = plan_share_links.plan_id AND fp.creator_id = auth.uid()
    )
  );

CREATE POLICY "plan_share_links_public_read" ON public.plan_share_links
  FOR SELECT USING (true);

-- Create indexes
CREATE INDEX idx_plan_share_links_slug ON public.plan_share_links(slug);
CREATE INDEX idx_plan_share_links_plan_id ON public.plan_share_links(plan_id);

-- Function to generate share slugs
CREATE OR REPLACE FUNCTION public.gen_plan_share_slug()
RETURNS TEXT AS $$
BEGIN
  RETURN string_agg(
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
           (floor(random()*36)+1)::int, 1),
    ''
  )
  FROM generate_series(1,8);
END;
$$ LANGUAGE plpgsql;