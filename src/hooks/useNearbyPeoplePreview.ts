import { useFriendVibeMatches } from './useFriendVibeMatches';

export interface NearbyPeoplePreview {
  count: number;
  topMatch: number;
  topMatchName: string;
  averageDistance: string;
}

export const useNearbyPeoplePreview = (): NearbyPeoplePreview => {
  const { data: friends } = useFriendVibeMatches();

  if (!friends || friends.length === 0) {
    return {
      count: 0,
      topMatch: 0,
      topMatchName: 'No matches',
      averageDistance: 'N/A'
    };
  }

  const sortedByMatch = [...friends].sort((a, b) => b.match - a.match);
  const topFriend = sortedByMatch[0];
  
  return {
    count: friends.length,
    topMatch: topFriend.match,
    topMatchName: topFriend.name,
    averageDistance: topFriend.contextualFactors.travelTime
  };
};