import { supabase } from '@/integrations/supabase/client';

// Avatar size presets - support both number and string keys
export type AvatarSize = 32 | 48 | 64 | 96 | 128 | 256 | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/**
 * Upload avatar with proper path structure and return public URL
 */
export async function uploadAvatar(file: File) {
  try {
    // Import telemetry for monitoring
    const { avatarTelemetry, trackTiming, logError } = await import('@/lib/monitoring/telemetry');

    // Start tracking upload
    avatarTelemetry.uploadStarted(file.size, file.type);
    const startTime = Date.now();

    return await trackTiming('Avatar Upload', async () => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        avatarTelemetry.uploadFailed('Not authenticated', file.size, 'auth');
        throw new Error('Not authenticated');
      }

      // Validate file size (5MB server-side limit)
      if (file.size > 5 * 1024 * 1024) {
        avatarTelemetry.uploadFailed('File too large', file.size, 'validation');
        throw new Error('File too large. Please select an image smaller than 5MB.');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        avatarTelemetry.uploadFailed('Invalid file type', file.size, 'validation');
        throw new Error('Invalid file type. Please select an image.');
      }

      // Generate secure filename with user ID path structure
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filename = `${globalThis.crypto.randomUUID()}.${fileExt}`;
      const path = `${user.id}/${filename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        avatarTelemetry.uploadFailed(uploadError.message, file.size, 'storage_upload');
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const duration = Date.now() - startTime;
      avatarTelemetry.uploadCompleted(file.size, duration, publicUrl);

      return {
        path: publicUrl,  // Return public URL instead of storage path
        publicUrl,
        error: null
      };
    });
  } catch (error: any) {
    console.error('Avatar upload failed:', error);

    // Log error to telemetry
    try {
      const { logError } = await import('@/lib/monitoring/telemetry');
      logError(error, {
        context: 'avatar_upload',
        fileSize: file.size,
        fileType: file.type,
      });
    } catch (e) {
      console.warn('Failed to log error to telemetry:', e);
    }

    return {
      path: null,
      publicUrl: null,
      error: error.message || 'Upload failed'
    };
  }
}

/**
 * Delete avatar from storage using public URL
 */
export async function deleteAvatar(publicUrl: string) {
  try {
    // Extract storage path from public URL
    const url = new URL(publicUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/);

    if (!pathMatch) {
      throw new Error('Invalid avatar URL format');
    }

    const storagePath = pathMatch[1];

    // Verify user owns this avatar (path should start with user ID)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    if (!storagePath.startsWith(user.id + '/')) {
      throw new Error('Unauthorized: Cannot delete this avatar');
    }

    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([storagePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    return { error: null };
  } catch (error: any) {
    console.error('Avatar delete failed:', error);
    return { error: error.message || 'Delete failed' };
  }
}

/**
 * Get avatar URL with transformation parameters
 */
export function getAvatarUrl(publicUrl?: string | null, size: number | AvatarSize = 64, updatedAt?: string): string | null {
  if (!publicUrl) return '/img/avatar-fallback.svg';

  // Convert size key to pixel value if needed
  const pixelSize = typeof size === 'string' ? AVATAR_SIZES[size] : size;

  // If it's already a public URL, return as-is with cache busting
  if (publicUrl.includes('supabase.co') || publicUrl.includes('localhost')) {
    const url = new URL(publicUrl);
    if (updatedAt) {
      url.searchParams.set('t', updatedAt);
    }
    return url.toString();
  }

  // For storage paths, build URL with proper encoding (avoid double-encoding)
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/` +
    (publicUrl.includes('%') ? publicUrl : encodeURIComponent(publicUrl));
}

/**
 * Get blurred placeholder URL for avatar
 */
export function getAvatarBlurUrl(publicUrl?: string | null, updatedAt?: string): string | null {
  if (!publicUrl) return null;

  // For public URLs, return a smaller version for blur effect
  if (publicUrl.includes('supabase.co') || publicUrl.includes('localhost')) {
    const url = new URL(publicUrl);
    if (updatedAt) {
      url.searchParams.set('t', updatedAt);
    }
    // Add blur transformation if supported
    url.searchParams.set('blur', '10');
    return url.toString();
  }

  return publicUrl;
}

/**
 * Pre-warm image for faster loading
 */
export const preWarmImage = (url: string) => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.crossOrigin = 'anonymous';

  document.head.appendChild(link);

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
 * Verify Transform CDN is working
 */
export const verifyTransformCDN = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Transform CDN verification failed:', error);
    return false;
  }
};

/**
 * Generate initials from display name or username
 */
export const getInitials = (displayName?: string | null, username?: string | null) => {
  const name = displayName || username;
  if (!name) return '🤔';

  const chars = Array.from(name.trim());
  if (chars.length === 0) return '🤔';

  const words = name.split(' ').filter(word => word.trim().length > 0);
  if (words.length > 0) {
    return words
      .map(word => Array.from(word.trim())[0]?.toUpperCase() || '')
      .filter(char => char.length > 0)
      .slice(0, 2)
      .join('');
  }

  return chars[0].toUpperCase();
};

// Standard avatar sizes for consistency
export const AVATAR_SIZES = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 128,
  xxl: 256
} as const;

/**
 * Generate deterministic color for user avatar fallback based on user ID
 */
export const getAvatarFallbackColor = (profileId: string) => {
  // Generate hash from user ID
  const hash = profileId.split('').reduce((a, b) => {
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