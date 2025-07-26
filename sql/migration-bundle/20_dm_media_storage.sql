BEGIN;

-- Create storage bucket for DM media
INSERT INTO storage.buckets (id, name, public)
VALUES ('dm_media', 'dm_media', false);

-- Create storage policies for DM media
CREATE POLICY "Users can upload their own DM media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'dm_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own DM media" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'dm_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own DM media" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'dm_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own DM media" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'dm_media' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;