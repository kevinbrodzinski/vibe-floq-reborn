-- Create rally_last_seen table for tracking read status  
CREATE TABLE IF NOT EXISTS public.rally_last_seen (
  profile_id uuid NOT NULL,
  rally_id uuid NOT NULL, 
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, rally_id)
);

-- Enable RLS
ALTER TABLE public.rally_last_seen ENABLE ROW LEVEL SECURITY;

-- Policy: users can only access their own last seen records
DROP POLICY IF EXISTS "Users can manage their own rally last seen" ON public.rally_last_seen;
CREATE POLICY "Users can manage their own rally last seen"
ON public.rally_last_seen
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());