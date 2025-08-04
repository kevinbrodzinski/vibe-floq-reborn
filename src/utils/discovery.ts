import { ACTIVITY_CATEGORIES, type ActivityType } from '@/config/discovery';
import type { ValidatedVenue } from '@/schemas/discovery';

// Round coordinates for privacy and cache efficiency
export function roundCoordinate(coord: number, precision: number = 4): number {
  return Math.round(coord * Math.pow(10, precision)) / Math.pow(10, precision);
}

// Create stable query key that prevents unnecessary cache thrashing
export function createDiscoveryQueryKey(
  userLocation: { lat: number; lng: number } | null,
  filters: {
    radius: number;
    vibe: string;
    activityType: string;
    groupSize: number;
    budget: string;
  },
  profileId?: string
) {
  if (!userLocation) return ['smart-discovery', null];
  
  return [
    'smart-discovery',
    {
      lat: roundCoordinate(userLocation.lat),
      lng: roundCoordinate(userLocation.lng),
      radius: filters.radius,
      vibe: filters.vibe,
      activityType: filters.activityType,
      groupSize: filters.groupSize,
      budget: filters.budget,
    },
    profileId,
  ];
}

// Clean activity matching function
export function matchesActivity(venue: ValidatedVenue, activityType: string): boolean {
  if (activityType === 'all') return true;
  
  const allowedCategories = ACTIVITY_CATEGORIES[activityType as keyof typeof ACTIVITY_CATEGORIES];
  if (!allowedCategories) return true;
  
  return venue.categories.some(cat => {
    const lowerCat = cat.toLowerCase();
    return (allowedCategories as readonly string[]).some(allowed => allowed === lowerCat);
  });
}

// Helper for price estimation based on venue data
export function getPriceForBudget(budget: string, rating?: number): string {
  switch (budget) {
    case 'free':
      return 'Free';
    case 'budget':
      return '$';
    case 'moderate':
      return '$$';
    case 'premium':
      return '$$$';
    default:
      return rating && rating > 4 ? '$$' : '$';
  }
}

// Helper for floq status determination
export function getFloqStatus(floq: any): 'open' | 'invite_only' | 'upcoming' | 'active' | 'full' | 'private' {
  if (floq.is_private) return 'private';
  if (floq.max_participants && floq.participant_count >= floq.max_participants) return 'full';
  if (floq.starts_at && new Date(floq.starts_at) > new Date()) return 'upcoming';
  if (floq.participant_count > 0) return 'active';
  return 'open';
}

// Weighted scoring for recommendations
export function calculateRecommendationScore(
  recommendation: { distance: number; rating?: number; participants?: number; live_count?: number },
  weights = { distance: 0.4, rating: 0.3, activity: 0.3 }
): number {
  const maxDistance = 5000; // 5km max for normalization
  const normalizedDistance = Math.min(recommendation.distance / maxDistance, 1);
  
  const distanceScore = (1 - normalizedDistance) * weights.distance;
  const ratingScore = (recommendation.rating || 0) / 5 * weights.rating;
  const activityScore = Math.min((recommendation.participants || recommendation.live_count || 0) / 20, 1) * weights.activity;
  
  return distanceScore + ratingScore + activityScore;
}