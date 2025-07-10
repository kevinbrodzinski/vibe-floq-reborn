import { useEffect } from 'react';
import { track } from '@/lib/analytics';

// Phase 1 Fix: Move analytics tracking to proper useEffect hook to prevent render loop spam
export const useAnalytics = () => {
  const trackFriendEncounter = (friendId: string, vibe: string, location: string) => {
    useEffect(() => {
      track('friend_encounter', { 
        friend_id: friendId, 
        vibe,
        location 
      });
    }, [friendId, vibe, location]);
  };

  return { trackFriendEncounter };
};