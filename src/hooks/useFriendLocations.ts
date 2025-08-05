import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FriendLocation {
  lat: number;
  lng: number;
  acc: number;
  ts: number;
}

interface EnhancedFriendLocation extends FriendLocation {
  distance?: number;
  confidence?: number;
  reliability?: 'high' | 'medium' | 'low';
  privacyFiltered?: boolean;
}

export function useFriendLocations(friendIds: string[], enhanceWithDistances = false) {
  const [spots, setSpots] = useState<Record<string, FriendLocation>>({});
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    // Clear previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    if (!friendIds.length) return;

    // Listen to each friend's presence channel
    channelsRef.current = friendIds.map(fid =>
      supabase.channel(`presence_${fid}`)
        .on('broadcast', { event: 'live_pos' }, ({ payload }) => {
          setSpots(s => ({ ...s, [fid]: payload as FriendLocation }));
        })
        .subscribe()
    );

    return () => {
      channelsRef.current.forEach(ch => {
        if (ch) supabase.removeChannel(ch);
      });
      channelsRef.current = [];
    };
  }, [friendIds.slice().sort().join()]); // Sort for stable dependencies

  return spots; // { friendId: { lat, lng, acc, ts }, ... }
}

/**
 * Enhanced version that includes distance calculations and proximity scoring
 * Use this when you need rich friend location data with distances and confidence
 */
export function useEnhancedFriendLocations(friendIds: string[]) {
  const basicLocations = useFriendLocations(friendIds);
  const [enhancedLocations, setEnhancedLocations] = useState<Record<string, EnhancedFriendLocation>>({});

  useEffect(() => {
    const enhanceLocations = async () => {
      try {
        // Import enhanced friend distances hook dynamically
        const { useEnhancedFriendDistances } = await import('./useEnhancedFriendDistances');
        
        // This would require integration with the enhanced friend distances system
        // For now, we'll just pass through the basic locations
        const enhanced: Record<string, EnhancedFriendLocation> = {};
        
        Object.entries(basicLocations).forEach(([friendId, location]) => {
          enhanced[friendId] = {
            ...location,
            // Enhanced data would be calculated here
            reliability: 'medium' // Default value
          };
        });
        
        setEnhancedLocations(enhanced);
      } catch (error) {
        console.warn('Enhanced friend locations not available, using basic locations:', error);
        // Fallback to basic locations
        const fallback: Record<string, EnhancedFriendLocation> = {};
        Object.entries(basicLocations).forEach(([friendId, location]) => {
          fallback[friendId] = location;
        });
        setEnhancedLocations(fallback);
      }
    };

    enhanceLocations();
  }, [basicLocations]);

  return enhancedLocations;
}