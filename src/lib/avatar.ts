import { supabase } from "@/integrations/supabase/client";

// Cache for pre-warmed images
const preWarmCache = new Set<string>();

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
    
  const url = `${data.publicUrl}?width=${size}&height=${size}&format=webp&quality=85`;
  
  // Pre-warm on first access
  if (!preWarmCache.has(url)) {
    preWarmImage(url);
    preWarmCache.add(url);
  }
  
  return url;
};

/**
 * Pre-warm image for faster loading
 */
export const preWarmImage = (url: string) => {
  if (typeof window === 'undefined') return;
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.loading = 'eager';
  img.decoding = 'async';
  
  // Handle load success
  img.onload = () => {
    console.debug('Avatar pre-warmed:', url);
  };
  
  // Handle errors silently
  img.onerror = () => {
    console.debug('Avatar pre-warm failed:', url);
  };
  
  img.src = url;
};

/**
 * Pre-warm multiple avatar sizes
 */
export const preWarmAvatarSizes = (path: string, sizes: number[] = [32, 64, 128]) => {
  sizes.forEach(size => {
    const url = getAvatarUrl(path, size);
    if (url) preWarmImage(url);
  });
};

/**
 * Verify Transform CDN is working by checking response headers
 */
export const verifyTransformCDN = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const xCache = response.headers.get('x-cache');
    const contentType = response.headers.get('content-type');
    
    console.log('Transform CDN verification:', {
      url,
      xCache,
      contentType,
      status: response.status
    });
    
    return response.ok && contentType?.includes('image/webp');
  } catch (error) {
    console.error('Transform CDN verification failed:', error);
    return false;
  }
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
    
    // Pre-warm multiple sizes (non-blocking)
    preWarmAvatarSizes(path, [32, 64, 128, 256]);
    
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