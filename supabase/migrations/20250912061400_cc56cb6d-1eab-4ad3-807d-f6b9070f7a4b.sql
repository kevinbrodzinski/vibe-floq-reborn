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
CREATE POLICY "Users can manage their own rally last seen"
ON public.rally_last_seen
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Update trigger
CREATE TRIGGER rally_last_seen_updated_at
  BEFORE UPDATE ON public.rally_last_seen
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- RPC function for setting rally last seen timestamp
CREATE OR REPLACE FUNCTION public.rally_set_last_seen(_rally_id uuid, _ts timestamptz DEFAULT now())
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.rally_last_seen(profile_id, rally_id, last_seen)
  VALUES (auth.uid(), _rally_id, _ts)
  ON CONFLICT (profile_id, rally_id) 
  DO UPDATE SET last_seen = EXCLUDED.last_seen, updated_at = now();
$$;