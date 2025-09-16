import { useEffect } from 'react';
import { preWarmAvatarSizes, verifyTransformCDN, getAvatarUrl } from '@/lib/avatar';

/**
 * Hook to preload avatars for better performance
 */
export const useAvatarPreloader = (
  avatarPaths: (string | null | undefined)[], 
  sizes: number[] = [32, 64, 128],
  observe?: React.RefObject<HTMLElement>[] // observe elements to prewarm on viewport entry
) => {
  useEffect(() => {
    const validPaths = avatarPaths.filter(Boolean) as string[];
    if (!validPaths.length) return;

    if (observe?.length) {
      // Viewport-based prefetch
      const io = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          validPaths.forEach(path => preWarmAvatarSizes(path, sizes));
        }
      }, { rootMargin: '120px' });
      
      observe.forEach(ref => ref?.current && io.observe(ref.current));
      return () => io.disconnect();
    }

    // Fallback: prewarm immediately
    validPaths.forEach(path => {
      preWarmAvatarSizes(path, sizes);
    });
    
    // Verify Transform CDN on first avatar (in development)
    if (import.meta.env.MODE === 'development' && validPaths.length > 0) {
      const testUrl = getAvatarUrl(validPaths[0], 64);
      if (testUrl) {
        verifyTransformCDN(testUrl).then(isWorking => {
          console.log('Transform CDN is working:', isWorking);
        });
      }
    }
  }, [avatarPaths.join('|'), sizes.join(','), observe]);
};