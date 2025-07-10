import { useEffect } from 'react';
import { preWarmAvatarSizes, verifyTransformCDN, getAvatarUrl } from '@/lib/avatar';

/**
 * Hook to preload avatars for better performance
 */
export const useAvatarPreloader = (avatarPaths: (string | null | undefined)[], sizes: number[] = [32, 64, 128]) => {
  useEffect(() => {
    const validPaths = avatarPaths.filter(Boolean) as string[];
    
    // Pre-warm all avatar sizes
    validPaths.forEach(path => {
      preWarmAvatarSizes(path, sizes);
    });
    
    // Verify Transform CDN on first avatar (in development)
    if (process.env.NODE_ENV === 'development' && validPaths.length > 0) {
      const testUrl = getAvatarUrl(validPaths[0], 64);
      if (testUrl) {
        verifyTransformCDN(testUrl).then(isWorking => {
          console.log('Transform CDN is working:', isWorking);
        });
      }
    }
  }, [avatarPaths, sizes]);
};