-- Create venues sync error logging table
CREATE TABLE IF NOT EXISTS public.venues_sync_errors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text   NOT NULL,
  external_id text   NULL,
  lat         numeric NULL,
  lng         numeric NULL,
  reason      text   NOT NULL,
  payload     jsonb  NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Add index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_venues_sync_errors_created_at 
ON public.venues_sync_errors(created_at DESC);

-- Add index for querying by source
CREATE INDEX IF NOT EXISTS idx_venues_sync_errors_source 
ON public.venues_sync_errors(source);

-- Enable RLS
ALTER TABLE public.venues_sync_errors ENABLE ROW LEVEL SECURITY;

-- Policy for service role to insert errors
CREATE POLICY "Service role can insert sync errors" 
ON public.venues_sync_errors 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Policy for authenticated users to read errors (for debugging)
CREATE POLICY "Authenticated users can read sync errors" 
ON public.venues_sync_errors 
FOR SELECT 
USING (auth.role() = 'authenticated');