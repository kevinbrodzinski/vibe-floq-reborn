import { supabase } from '@/integrations/supabase/client';

export async function uploadDmImage(
  profileId: string,
  threadId: string,
  file: File
) {
  const path = `${profileId}/${threadId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from('dm_media')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  // Generate a signed URL valid for 6h (avoid public bucket)
  const { data } = await supabase.storage
    .from('dm_media')
    .createSignedUrl(path, 60 * 60 * 6);

  return { path, signedUrl: data?.signedUrl };
}

export async function uploadDmVoiceNote(
  profileId: string,
  threadId: string,
  file: File
) {
  const path = `${profileId}/${threadId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage
    .from('dm_media')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  // Generate a signed URL valid for 6h
  const { data } = await supabase.storage
    .from('dm_media')
    .createSignedUrl(path, 60 * 60 * 6);

  return { path, signedUrl: data?.signedUrl };
}