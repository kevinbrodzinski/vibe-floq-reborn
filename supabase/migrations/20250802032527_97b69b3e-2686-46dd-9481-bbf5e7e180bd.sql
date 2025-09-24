-- Add RLS policy for field_tiles table to allow public read access
CREATE POLICY "anon_read_field_tiles"
ON public.field_tiles
FOR SELECT
TO anon
USING (true);