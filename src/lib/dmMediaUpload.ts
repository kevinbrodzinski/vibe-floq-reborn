import { supabase } from '@/integrations/supabase/client';

export async function uploadDmImage(
  threadId: string,
  senderId: string,
  file: File
) {
  // Path pattern: <threadId>/<senderId>/<uuid>-<filename>
  const path = `${threadId}/${senderId}/${crypto.randomUUID()}-${file.name}`;
  
  const { error } = await supabase.storage
    .from('dm_media')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  // Generate a signed URL valid for 6h (private bucket)
  const { data } = await supabase.storage
    .from('dm_media')
    .createSignedUrl(path, 60 * 60 * 6);

  return { path, signedUrl: data?.signedUrl };
}

export async function uploadDmVoiceNote(
  threadId: string,
  senderId: string,
  file: File
) {
  // Path pattern: <threadId>/<senderId>/<uuid>-<filename>
  const path = `${threadId}/${senderId}/${crypto.randomUUID()}-${file.name}`;
  
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

export async function getDmMediaUrl(path: string) {
  const { data } = await supabase.storage
    .from('dm_media')
    .createSignedUrl(path, 60 * 60 * 6);
  
  return data?.signedUrl;
}