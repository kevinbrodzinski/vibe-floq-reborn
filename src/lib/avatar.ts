import { supabase } from "@/integrations/supabase/client";

/**
 * Generate avatar URL with Transform CDN sizing
 * @param path - Storage path to the avatar file
 * @param size - Desired size in pixels (default: 64)
 * @returns Public URL with transform parameters, or undefined if no path
 */
export const getAvatarUrl = (path?: string | null, size = 64) => {
  if (!path) return undefined; // fallback to initials
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
    
  return `${data.publicUrl}?width=${size}&height=${size}&format=webp`;
};

/**
 * Upload avatar file and update user profile
 * @param file - Image file to upload
 * @returns Promise with the storage path or error
 */
export const uploadAvatar = async (file: File) => {
  try {
    const user = supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const ext = file.type.split('/')[1] || 'jpg';
    const path = `${(await user).data.user?.id}/${crypto.randomUUID()}.${ext}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        upsert: true,
        cacheControl: 'public, max-age=31536000',
      });
      
    if (uploadError) throw uploadError;
    
    // Update profile with new avatar path
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: path })
      .eq('id', (await user).data.user?.id);
      
    if (updateError) throw updateError;
    
    // Pre-warm tiny variant (non-blocking)
    fetch(getAvatarUrl(path, 64)).catch(() => {
      // Ignore pre-warming errors
    });
    
    return { path, error: null };
  } catch (error) {
    return { path: null, error };
  }
};

/**
 * Delete avatar from storage and clear profile
 */
export const deleteAvatar = async (path: string) => {
  try {
    const user = supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([path]);
      
    if (deleteError) throw deleteError;
    
    // Clear profile avatar_url
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', (await user).data.user?.id);
      
    if (updateError) throw updateError;
    
    return { error: null };
  } catch (error) {
    return { error };
  }
};

/**
 * Generate initials from display name
 */
export const getInitials = (displayName?: string | null) => {
  if (!displayName) return '??';
  return displayName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};