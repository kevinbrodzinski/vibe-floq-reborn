import { useMemo } from 'react';
import { getAvatarUrl, getAvatarBlurUrl, type AvatarSize } from '@/lib/avatar';

// URL cache to prevent repeated generation
const urlCache = new Map<string, string>();

/**
 * Hook for memoized avatar URL generation
 * Prevents console spam by caching URLs and avoiding repeated getPublicUrl calls
 */
export const useAvatarUrl = (
  avatarPath?: string | null,
  size: number | AvatarSize = 64,
  updatedAt?: string
) => {
  return useMemo(() => {
    if (!avatarPath) return null;
    
    const pixelSize = typeof size === 'number' ? size : size;
    const cacheKey = `${avatarPath}-${pixelSize}-${updatedAt || 'no-ts'}`;
    
    // Return cached URL if available
    if (urlCache.has(cacheKey)) {
      return urlCache.get(cacheKey)!;
    }
    
    // Generate new URL and cache it
    const url = getAvatarUrl(avatarPath, size, updatedAt);
    if (url) {
      urlCache.set(cacheKey, url);
    }
    
    return url;
  }, [avatarPath, size, updatedAt]);
};

/**
 * Hook for memoized blur placeholder URL
 */
export const useAvatarBlurUrl = (avatarPath?: string | null, updatedAt?: string) => {
  return useMemo(() => {
    if (!avatarPath) return null;
    
    const cacheKey = `blur-${avatarPath}-${updatedAt || 'no-ts'}`;
    
    if (urlCache.has(cacheKey)) {
      return urlCache.get(cacheKey)!;
    }
    
    const url = getAvatarBlurUrl(avatarPath, updatedAt);
    if (url) {
      urlCache.set(cacheKey, url);
    }
    
    return url;
  }, [avatarPath, updatedAt]);
};

/**
 * Clear URL cache (useful for profile updates)
 */
export const clearAvatarUrlCache = (avatarPath?: string) => {
  if (!avatarPath) {
    urlCache.clear();
    return;
  }
  
  // Clear specific avatar's cached URLs
  for (const key of urlCache.keys()) {
    if (key.startsWith(avatarPath) || key.startsWith(`blur-${avatarPath}`)) {
      urlCache.delete(key);
    }
  }
};