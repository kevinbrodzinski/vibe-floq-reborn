import { useMemo } from 'react';
import { useNearbyFriends } from './useNearbyFriends';
import { useFriendVibeMatches } from './useFriendVibeMatches';
import { useEnhancedLocationSharing } from './location/useEnhancedLocationSharing';

export interface ProximityFriend {
  id: string;
  distance: number;
  confidence: number;
  vibe: string;
  name?: string;
  username?: string;
  avatar?: string;
  lastSeen?: Date;
}

export interface ProximityInsights {
  nearbyFriendsCount: number;
  averageDistance: number;
  highConfidenceConnections: number;
  recentActivity: number;
}

/**
 * Provides real proximity data for friends instead of mock data
 * Combines location data with friend matching to create proximity insights
 */
export const useRealProximityData = () => {
  const enhancedLocation = useEnhancedLocationSharing();
  const { data: nearbyFriends = [], isLoading: nearbyLoading } = useNearbyFriends(
    enhancedLocation.location?.lat,
    enhancedLocation.location?.lng,
    { km: 2, enabled: !!enhancedLocation.location }
  );
  
  const { data: friendVibeMatches = [] } = useFriendVibeMatches();

  const proximityFriends: ProximityFriend[] = useMemo(() => {
    if (!nearbyFriends.length) return [];

    return nearbyFriends.map((friend: any) => {
      // Find matching vibe data for this friend
      const vibeMatch = friendVibeMatches.find(vm => vm.id === friend.id);
      
      return {
        id: friend.id,
        distance: friend.distance_meters || 500, // fallback distance
        confidence: friend.confidence || 0.8,
        vibe: vibeMatch?.currentVibe || friend.current_vibe || 'chill',
        name: friend.display_name || friend.name,
        username: friend.username,
        avatar: friend.avatar_url,
        lastSeen: friend.last_seen ? new Date(friend.last_seen) : new Date(),
      };
    });
  }, [nearbyFriends, friendVibeMatches]);

  const proximityInsights: ProximityInsights = useMemo(() => {
    if (!proximityFriends.length) {
      return {
        nearbyFriendsCount: 0,
        averageDistance: 0,
        highConfidenceConnections: 0,
        recentActivity: 0,
      };
    }

    const totalDistance = proximityFriends.reduce((sum, f) => sum + f.distance, 0);
    const averageDistance = totalDistance / proximityFriends.length;
    const highConfidenceConnections = proximityFriends.filter(f => f.confidence > 0.8).length;
    
    // Count friends seen within the last 15 minutes as recent activity
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentActivity = proximityFriends.filter(f => 
      f.lastSeen && f.lastSeen > fifteenMinutesAgo
    ).length;

    return {
      nearbyFriendsCount: proximityFriends.length,
      averageDistance,
      highConfidenceConnections,
      recentActivity,
    };
  }, [proximityFriends]);

  return {
    proximityFriends,
    proximityInsights,
    isLoading: nearbyLoading,
    hasProximityData: proximityFriends.length > 0,
  };
};