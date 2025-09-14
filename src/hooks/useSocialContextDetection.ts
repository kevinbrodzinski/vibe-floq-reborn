import { useEffect, useState } from 'react';
import { detectSocialContext } from '@/core/patterns/social-context';
import type { SocialContext } from '@/core/patterns/store';

/**
 * Hook to detect current social context from cached friend data
 */
export function useSocialContextDetection() {
  const [socialContext, setSocialContext] = useState<SocialContext>('alone');
  const [nearbyFriendCount, setNearbyFriendCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const updateSocialContext = () => {
      try {
        // Get cached friend data (set by friend distance systems)
        const friendData = sessionStorage.getItem('nearby-friends-cache');
        const nearbyFriends = friendData 
          ? JSON.parse(friendData).filter((f: any) => f.distance && f.distance <= 100).length 
          : 0;
        
        const detectedContext = detectSocialContext(nearbyFriends);
        setSocialContext(detectedContext);
        setNearbyFriendCount(nearbyFriends);
        setLoading(false);
        
        if (import.meta.env.DEV) {
          console.log('[SocialContext] Detected:', {
            nearbyFriends,
            context: detectedContext
          });
        }
      } catch (error) {
        console.warn('[SocialContext] Failed to detect context:', error);
        setSocialContext('alone');
        setNearbyFriendCount(0);
        setLoading(false);
      }
    };

    // Initial detection
    updateSocialContext();
    
    // Check periodically for changes
    const interval = setInterval(updateSocialContext, 30000); // Every 30s
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    socialContext,
    nearbyFriendCount,
    loading
  };
}