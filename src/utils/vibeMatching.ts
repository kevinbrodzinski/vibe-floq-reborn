// Vibe compatibility matrix - how well different vibes match
const VIBE_COMPATIBILITY: Record<string, Record<string, number>> = {
  // User vibe -> Venue vibe -> compatibility score (0-1)
  'chill': {
    'chill': 0.95,
    'social': 0.75,
    'romantic': 0.85,
    'energy': 0.35,
    'family': 0.80,
    'work': 0.90,
    'creative': 0.85,
    'wellness': 0.90
  },
  'social': {
    'social': 0.95,
    'chill': 0.75,
    'energy': 0.85,
    'romantic': 0.60,
    'family': 0.70,
    'work': 0.40,
    'creative': 0.75,
    'wellness': 0.50
  },
  'romantic': {
    'romantic': 0.95,
    'chill': 0.85,
    'social': 0.60,
    'energy': 0.45,
    'family': 0.30,
    'work': 0.20,
    'creative': 0.80,
    'wellness': 0.75
  },
  'energy': {
    'energy': 0.95,
    'social': 0.85,
    'chill': 0.35,
    'romantic': 0.45,
    'family': 0.50,
    'work': 0.30,
    'creative': 0.70,
    'wellness': 0.60
  },
  'family': {
    'family': 0.95,
    'chill': 0.80,
    'social': 0.70,
    'romantic': 0.30,
    'energy': 0.50,
    'work': 0.40,
    'creative': 0.75,
    'wellness': 0.85
  },
  'work': {
    'work': 0.95,
    'chill': 0.90,
    'social': 0.40,
    'romantic': 0.20,
    'energy': 0.30,
    'family': 0.40,
    'creative': 0.80,
    'wellness': 0.70
  },
  'creative': {
    'creative': 0.95,
    'chill': 0.85,
    'social': 0.75,
    'romantic': 0.80,
    'energy': 0.70,
    'family': 0.75,
    'work': 0.80,
    'wellness': 0.80
  },
  'wellness': {
    'wellness': 0.95,
    'chill': 0.90,
    'social': 0.50,
    'romantic': 0.75,
    'energy': 0.60,
    'family': 0.85,
    'work': 0.70,
    'creative': 0.80
  }
};

// Time-based vibe adjustments
const TIME_VIBE_MODIFIERS: Record<string, Record<string, number>> = {
  'morning': {
    'work': 1.2,
    'wellness': 1.15,
    'chill': 1.1,
    'energy': 0.8,
    'social': 0.7,
    'romantic': 0.6
  },
  'afternoon': {
    'social': 1.1,
    'work': 1.05,
    'chill': 1.0,
    'energy': 0.9,
    'romantic': 0.8,
    'wellness': 0.95
  },
  'evening': {
    'romantic': 1.2,
    'social': 1.15,
    'energy': 1.1,
    'chill': 0.9,
    'work': 0.6,
    'wellness': 0.8
  },
  'night': {
    'energy': 1.25,
    'social': 1.2,
    'romantic': 1.1,
    'chill': 0.7,
    'work': 0.3,
    'wellness': 0.4
  }
};

export function calculateVibeMatch(
  userVibe: string,
  venueVibe: string | null,
  venueVibeScore: number | null,
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 'evening'
): number {
  // Default fallback if no vibe data
  if (!userVibe || !venueVibe) {
    return Math.random() * 0.4 + 0.5; // 50-90% fallback
  }

  // Get base compatibility score
  const baseCompatibility = VIBE_COMPATIBILITY[userVibe.toLowerCase()]?.[venueVibe.toLowerCase()] || 0.5;
  
  // Apply venue vibe strength (if venue has a strong vibe presence, it affects the match)
  const vibeStrength = venueVibeScore ? Math.min(venueVibeScore, 1) : 0.7; // Default to moderate vibe strength
  
  // Apply time-of-day modifier
  const timeModifier = TIME_VIBE_MODIFIERS[timeOfDay]?.[venueVibe.toLowerCase()] || 1.0;
  
  // Calculate final score
  let finalScore = baseCompatibility * vibeStrength * timeModifier;
  
  // Add some randomness for variety (±5%)
  const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9 to 1.1
  finalScore *= randomFactor;
  
  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, finalScore));
}

export function getTimeOfDay(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

// Helper to get vibe-appropriate venues
export function sortByVibeMatch(
  venues: any[],
  userVibe: string,
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
): any[] {
  const currentTimeOfDay = timeOfDay || getTimeOfDay();
  
  return venues.map(venue => ({
    ...venue,
    calculatedVibeMatch: calculateVibeMatch(
      userVibe,
      venue.vibe_tag || venue.primary_vibe,
      venue.vibe_score,
      currentTimeOfDay
    )
  })).sort((a, b) => b.calculatedVibeMatch - a.calculatedVibeMatch);
}