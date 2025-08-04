import { useCallback, useRef } from "react";
import { getEnvironmentConfig } from '@/lib/environment';
import { useEnhancedFriendDistances } from './useEnhancedFriendDistances';

interface NearbyFriend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  distance_m: number;
}

interface UseNearbyFriendsOptions {
  km?: number;             // default radius
  enabled?: boolean;
}

/**
 * Returns online friends within `km` radius of (lat,lng).
 * Now powered by the enhanced friend distance system!
 */
export function useNearbyFriends(
  lat?: number,
  lng?: number,
  { km = 1, enabled = true }: UseNearbyFriendsOptions = {}
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const env = getEnvironmentConfig();

  const debouncedPrimeProfiles = useCallback((primeProfiles: (users: any[]) => void, users: any[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      primeProfiles(users);
    }, 300);
  }, []);

  // Use enhanced friend distances system
  const {
    friends,
    isLoading,
    error,
    getFriendsWithinDistance
  } = useEnhancedFriendDistances({
    maxDistance: km * 1000, // convert km to meters
    enableProximityTracking: true,
    enablePrivacyFiltering: true,
    sortBy: 'distance'
  });

  if (env.presenceMode === 'offline' || env.presenceMode === 'mock') {
    // Return empty array for non-live modes
    const result = {
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
    return { ...result, debouncedPrimeProfiles };
  }

  // Convert enhanced friend distances to legacy format
  const nearbyFriends: NearbyFriend[] = friends
    .filter(friendDistance => enabled && friendDistance.distance <= km * 1000)
    .map(friendDistance => ({
      id: friendDistance.friend.profileId, // Using profileId as the primary identifier
      display_name: friendDistance.friend.displayName,
      avatar_url: friendDistance.friend.avatarUrl,
      lat: friendDistance.friend.location.lat,
      lng: friendDistance.friend.location.lng,
      distance_m: Math.round(friendDistance.distance)
    }));

  const result = {
    data: nearbyFriends,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !error && !isLoading,
  };
  
  if (env.debugPresence) {
    console.log(`✅ useNearbyFriends - Enhanced system found ${nearbyFriends.length} friends within ${km}km`);
  }
  
  return { ...result, debouncedPrimeProfiles };
}