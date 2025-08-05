-- Fix #2: Add anon read policy for field_tiles
CREATE POLICY anon_read_tiles ON public.field_tiles 
FOR SELECT TO anon 
USING (true);