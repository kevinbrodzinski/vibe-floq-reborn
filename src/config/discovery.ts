// Discovery configuration constants
export const DISCOVERY_CONFIG = {
  MAX_RESULTS: 20,
  DEFAULT_RADIUS_M: 1000,
  DEFAULT_LIMIT: 5,
  STALE_TIME_MS: 30_000,
  COORDINATE_PRECISION: 4, // ~11m precision for privacy
  DEBOUNCE_MS: 250,
  REQUEST_TIMEOUT_MS: 10_000,
} as const;

// Activity type mapping for cleaner filtering
export const ACTIVITY_CATEGORIES = {
  food: ['restaurant', 'cafe', 'bar', 'food'],
  entertainment: ['entertainment', 'movie_theater', 'bowling_alley', 'amusement_park'],
  outdoor: ['park', 'natural_feature', 'campground'],
  wellness: ['gym', 'spa', 'yoga_studio', 'health'],
  culture: ['museum', 'art_gallery', 'library', 'theater'],
  nightlife: ['bar', 'nightclub', 'casino'],
} as const;

export type ActivityType = keyof typeof ACTIVITY_CATEGORIES;