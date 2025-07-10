import { supabase } from "@/integrations/supabase/client";

// Cache for pre-warmed images
const preWarmCache = new Set<string>();

// Standard avatar sizes for consistency
export const AVATAR_SIZES = {
  xs: 32,
  sm: 48, 
  md: 64,
  lg: 96,
  xl: 128,
  xxl: 256
} as const;

export type AvatarSize = keyof typeof AVATAR_SIZES;

/**
 * Generate optimized avatar URL with Transform CDN
 * @param path - Storage path to the avatar file
 * @param size - Avatar size (number or size key)
 * @returns Transform CDN URL with optimization parameters
 */
export const getAvatarUrl = (path?: string | null, size: number | AvatarSize = 64) => {
  if (!path) return undefined;
  
  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZES[size];
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
    
  // Transform CDN with advanced optimization
  const transformUrl = `${data.publicUrl}?width=${pixelSize}&height=${pixelSize}&resize=cover&format=webp&quality=85&dpr=2`;
  
  // Pre-warm on first access
  if (!preWarmCache.has(transformUrl)) {
    preWarmImage(transformUrl);
    preWarmCache.add(transformUrl);
  }
  
  return transformUrl;
};

/**
 * Generate blur placeholder URL (tiny, heavily compressed)
 * @param path - Storage path to the avatar file
 * @returns Small blur placeholder URL
 */
export const getAvatarBlurUrl = (path?: string | null) => {
  if (!path) return undefined;
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
    
  return `${data.publicUrl}?width=20&height=20&resize=cover&format=webp&quality=20&blur=10`;
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