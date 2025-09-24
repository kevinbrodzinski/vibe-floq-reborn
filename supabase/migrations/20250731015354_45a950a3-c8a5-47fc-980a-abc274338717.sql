-- Enable RLS on integrations.place_feed_raw table
ALTER TABLE integrations.place_feed_raw ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to only allow service role to access place_feed_raw
-- This table is only meant for edge functions and the normalizer function
CREATE POLICY "service_role_only_place_feed_raw" 
ON integrations.place_feed_raw 
FOR ALL 
USING (current_setting('role') = 'service_role');