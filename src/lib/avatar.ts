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
 * @param updatedAt - Timestamp for cache busting
 * @returns Transform CDN URL with optimization parameters
 */
export const getAvatarUrl = (path?: string | null, size: number | AvatarSize = 64, updatedAt?: string) => {
  if (!path) return undefined;
  
  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZES[size];
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
    
  // Transform CDN with advanced optimization + cache busting
  const cacheParam = updatedAt ? `&v=${encodeURIComponent(updatedAt)}` : '';
  const transformUrl = `${data.publicUrl}?width=${pixelSize}&height=${pixelSize}&resize=cover&format=webp&quality=85&dpr=2${cacheParam}`;
  
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
 * @param updatedAt - Timestamp for cache busting
 * @returns Small blur placeholder URL
 */
export const getAvatarBlurUrl = (path?: string | null, updatedAt?: string) => {
  if (!path) return undefined;
  
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);
    
  const cacheParam = updatedAt ? `&v=${encodeURIComponent(updatedAt)}` : '';
  return `${data.publicUrl}?width=20&height=20&resize=cover&format=webp&quality=20&blur=10${cacheParam}`;
};

/**
 * Generate signed avatar URL (for private bucket access)
 * @param path - Storage path to the avatar file
 * @param size - Avatar size (number or size key)
 * @param expiresIn - URL expiration time in seconds (default: 3600)
 * @param updatedAt - Timestamp for cache busting
 * @returns Signed URL with transform parameters
 */
export const getSignedAvatarUrl = async (
  path?: string | null, 
  size: number | AvatarSize = 64, 
  expiresIn = 3600,
  updatedAt?: string
) => {
  if (!path) return undefined;
  
  const pixelSize = typeof size === 'number' ? size : AVATAR_SIZES[size];
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, expiresIn);
    
  if (error || !data) return undefined;
  
  // Transform CDN with signed URL + cache busting
  const cacheParam = updatedAt ? `&v=${encodeURIComponent(updatedAt)}` : '';
  return `${data.signedUrl}&width=${pixelSize}&height=${pixelSize}&resize=cover&format=webp&quality=85&dpr=2${cacheParam}`;
};

/**
 * Pre-warm image for faster loading (optimized for public bucket)
 */
export const preWarmImage = (url: string) => {
  if (typeof window === 'undefined') return;
  
  // Use browser-native preloading for public URLs - no manual image loading needed
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.crossOrigin = 'anonymous';
  
  // Add to document head temporarily
  document.head.appendChild(link);
  
  // Clean up after a short delay
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
  }, 1000);
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
 * Generate initials from display name or username
 */
export const getInitials = (displayName?: string | null, username?: string | null) => {
  const name = displayName || username;
  if (!name) return '🤔';
  
  // Handle emoji-only names using Array.from for proper Unicode support
  const chars = Array.from(name.trim());
  if (chars.length === 0) return '🤔';
  
  // Try to get meaningful initials from words
  const words = name.split(' ').filter(word => word.trim().length > 0);
  if (words.length > 0) {
    return words
      .map(word => Array.from(word.trim())[0]?.toUpperCase() || '')
      .filter(char => char.length > 0)
      .slice(0, 2)
      .join('');
  }
  
  // Fallback to first character if no spaces
  return chars[0].toUpperCase();
};

/**
 * Generate deterministic color for user avatar fallback based on user ID
 */
export const getAvatarFallbackColor = (userId: string) => {
  // Generate hash from user ID
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a; // Convert to 32bit integer
  }, 0);
  
  // Use hash to pick from predefined color palette
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))', 
    'hsl(210, 40%, 60%)', // blue
    'hsl(120, 40%, 60%)', // green
    'hsl(30, 40%, 60%)',  // orange
    'hsl(270, 40%, 60%)', // purple
    'hsl(180, 40%, 60%)', // teal
    'hsl(350, 40%, 60%)', // pink
  ];
  
  return colors[Math.abs(hash) % colors.length];
};