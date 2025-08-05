import { supabase } from '@/integrations/supabase/client';

export async function uploadDmMedia(file: File) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const uid = user.id;
  const path = `${uid}/${Date.now()}_${file.name}`;
  
  const { error } = await supabase.storage
    .from('dm_media')
    .upload(path, file, { 
      cacheControl: '3600',
      upsert: false
    });
    
  if (error) throw error;
  
  return supabase.storage.from('dm_media').getPublicUrl(path).data.publicUrl;
}