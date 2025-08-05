import { weightedHue, blendHue } from './color';
import { VIBE_RGB } from '@/constants/vibes';
import type { Vibe } from '@/lib/vibes';

export interface VibeMatchResult {
  matchPercentage: number;
  blendedColor: string;
  userHue: number;
  eventHue: number;
  angularDistance: number;
}

/**
 * Calculate vibe match between user and event/venue
 */
export const calculateVibeMatch = (
  userVibeCounts: Record<string, number>,
  eventVibeCounts: Record<string, number>,
  userPreferences: Record<string, number> = {}
): VibeMatchResult => {
  // Calculate weighted hues for both user and event
  const userHue = weightedHue(userVibeCounts, userPreferences);
  const eventHue = weightedHue(eventVibeCounts, {});
  
  // Calculate angular distance (0-180 degrees)
  const hueDiff = Math.abs(userHue - eventHue);
  const angularDistance = Math.min(hueDiff, 360 - hueDiff);
  
  // Convert to match percentage (0-100%)
  const matchPercentage = Math.max(0, 100 - (angularDistance / 180) * 100);
  
  // Get user's dominant vibe for base color
  const userDominantVibe = Object.entries(userVibeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] as Vibe;
  
  const baseColor: [number, number, number] = userDominantVibe && VIBE_RGB[userDominantVibe] 
    ? VIBE_RGB[userDominantVibe] as [number, number, number]
    : [100, 150, 255]; // Default blue
  
  // Blend colors based on match percentage
  const blendedRgb = blendHue(baseColor, eventHue, matchPercentage / 100);
  const blendedColor = `rgb(${blendedRgb.join(', ')})`;
  
  return {
    matchPercentage,
    blendedColor,
    userHue,
    eventHue,
    angularDistance
  };
};

/**
 * Get user's vibe distribution from recent activity or current vibe
 */
export const getUserVibeDistribution = (
  currentVibe: string | null,
  recentActivity: Array<{ vibe: string }> = []
): Record<string, number> => {
  if (!currentVibe && recentActivity.length === 0) {
    return { chill: 1 }; // Default fallback
  }
  
  const distribution: Record<string, number> = {};
  
  // Add current vibe with high weight
  if (currentVibe) {
    distribution[currentVibe] = 3;
  }
  
  // Add recent activity vibes with lower weights
  recentActivity.forEach(({ vibe }) => {
    distribution[vibe] = (distribution[vibe] || 0) + 1;
  });
  
  return distribution;
};

/**
 * Get event/venue vibe distribution from crowd data or event tags
 */
export const getEventVibeDistribution = (
  crowdData: Array<{ vibe: string }> = [],
  eventTags: string[] = [],
  dominantVibe?: string
): Record<string, number> => {
  const distribution: Record<string, number> = {};
  
  // Add dominant vibe with high weight if provided
  if (dominantVibe) {
    distribution[dominantVibe] = 5;
  }
  
  // Add crowd data
  crowdData.forEach(({ vibe }) => {
    distribution[vibe] = (distribution[vibe] || 0) + 1;
  });
  
  // Add event tags as vibe indicators
  eventTags.forEach(tag => {
    const vibeFromTag = mapTagToVibe(tag);
    if (vibeFromTag) {
      distribution[vibeFromTag] = (distribution[vibeFromTag] || 0) + 0.5;
    }
  });
  
  return distribution;
};

/**
 * Map event tags to vibes
 */
const mapTagToVibe = (tag: string): string | null => {
  const tagLower = tag.toLowerCase();
  
  if (tagLower.includes('party') || tagLower.includes('club') || tagLower.includes('dance')) {
    return 'hype';
  }
  if (tagLower.includes('coffee') || tagLower.includes('cafe') || tagLower.includes('chill')) {
    return 'chill';
  }
  if (tagLower.includes('date') || tagLower.includes('romantic') || tagLower.includes('couple')) {
    return 'romantic';
  }
  if (tagLower.includes('meetup') || tagLower.includes('social') || tagLower.includes('group')) {
    return 'social';
  }
  if (tagLower.includes('art') || tagLower.includes('creative') || tagLower.includes('weird')) {
    return 'weird';
  }
  if (tagLower.includes('solo') || tagLower.includes('alone') || tagLower.includes('quiet')) {
    return 'solo';
  }
  if (tagLower.includes('flow') || tagLower.includes('zen') || tagLower.includes('meditation')) {
    return 'flowing';
  }
  if (tagLower.includes('open') || tagLower.includes('explore') || tagLower.includes('adventure')) {
    return 'open';
  }
  
  return null;
};

/**
 * Get match level description
 */
export const getMatchDescription = (matchPercentage: number): string => {
  if (matchPercentage >= 90) return 'Perfect Match';
  if (matchPercentage >= 75) return 'Great Match';
  if (matchPercentage >= 60) return 'Good Match';
  if (matchPercentage >= 40) return 'Decent Match';
  if (matchPercentage >= 20) return 'Weak Match';
  return 'Poor Match';
};

/**
 * Get match color for UI
 */
export const getMatchColor = (matchPercentage: number): string => {
  if (matchPercentage >= 80) return 'text-green-400';
  if (matchPercentage >= 60) return 'text-yellow-400';
  if (matchPercentage >= 40) return 'text-orange-400';
  return 'text-red-400';
}; 