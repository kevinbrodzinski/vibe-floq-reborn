/**
 * Checks if a URL is a Google Places image that requires authentication
 * @param url The image URL to check
 * @returns true if the URL is a Google Places image that should be blocked
 */
export function isGooglePlacesImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  return (
    url.includes('googleusercontent.com') ||
    url.includes('places.googleapis.com') ||
    url.includes('maps.googleapis.com/maps/api/place/photo') ||
    url.includes('lh3.googleusercontent.com/places/')
  );
}

/**
 * Filters out Google Places URLs and provides a fallback
 * @param url The original image URL
 * @param fallback The fallback URL to use if the original is a Google Places URL
 * @returns The original URL if safe, or the fallback if it's a Google Places URL
 */
export function filterGooglePlacesUrl(url: string | null | undefined, fallback: string): string {
  if (!url || isGooglePlacesImageUrl(url)) {
    return fallback;
  }
  return url;
}

/**
 * Enhanced version that provides contextual fallbacks based on venue data
 * @param url The original image URL
 * @param venue Venue data for contextual fallback selection
 * @returns The original URL if safe, or a contextual fallback if it's a Google Places URL
 */
export function filterGooglePlacesUrlWithContext(
  url: string | null | undefined, 
  venue: {
    id?: string;
    name?: string;
    categories?: string[];
    canonical_tags?: string[];
  }
): string {
  if (!url || isGooglePlacesImageUrl(url)) {
    return getContextualVenueImage(venue);
  }
  return url;
}

/**
 * Default fallback image for venues
 */
export const DEFAULT_VENUE_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop';

/**
 * Default fallback image for events
 */
export const DEFAULT_EVENT_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop';

/**
 * Default fallback image for floqs
 */
export const DEFAULT_FLOQ_IMAGE = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400&h=400&fit=crop';

/**
 * Venue fallback images categorized by type/vibe for variety
 */
const VENUE_FALLBACK_IMAGES = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop', // Restaurant interior
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop', // Restaurant table setting
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop', // Modern restaurant
  ],
  bar: [
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&h=400&fit=crop', // Bar interior
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=400&fit=crop', // Cocktail bar
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=400&fit=crop', // Dark bar atmosphere
  ],
  cafe: [
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop', // Coffee shop
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=400&fit=crop', // Cozy cafe
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&h=400&fit=crop', // Modern cafe
  ],
  outdoor: [
    'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=400&h=400&fit=crop', // Outdoor dining
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop', // Rooftop terrace
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=400&fit=crop', // Patio seating
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop', // Live music venue
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', // Theater/club
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop', // Concert venue
  ],
  retail: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop', // Store interior
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', // Boutique shop
    'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=400&h=400&fit=crop', // Modern retail
  ],
  fitness: [
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop', // Gym interior
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop', // Fitness studio
    'https://images.unsplash.com/photo-1506629905607-d5b2a2bb5305?w=400&h=400&fit=crop', // Yoga studio
  ],
  default: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=400&fit=crop',
  ]
};

/**
 * Gets a contextual fallback image based on venue characteristics
 */
export function getContextualVenueImage(venue: {
  id?: string;
  name?: string;
  categories?: string[];
  canonical_tags?: string[];
}): string {
  // Determine venue category based on tags/categories
  const tags = [...(venue.categories || []), ...(venue.canonical_tags || [])].map(tag => tag.toLowerCase());
  
  let category = 'default';
  
  // Check for specific venue types
  if (tags.some(tag => ['restaurant', 'dining', 'food', 'eatery'].includes(tag))) {
    category = 'restaurant';
  } else if (tags.some(tag => ['bar', 'pub', 'cocktail', 'brewery', 'nightlife'].includes(tag))) {
    category = 'bar';
  } else if (tags.some(tag => ['cafe', 'coffee', 'coffeehouse', 'espresso'].includes(tag))) {
    category = 'cafe';
  } else if (tags.some(tag => ['outdoor', 'rooftop', 'patio', 'terrace', 'garden'].includes(tag))) {
    category = 'outdoor';
  } else if (tags.some(tag => ['music', 'live', 'club', 'theater', 'entertainment', 'concert'].includes(tag))) {
    category = 'entertainment';
  } else if (tags.some(tag => ['shop', 'store', 'retail', 'boutique', 'market'].includes(tag))) {
    category = 'retail';
  } else if (tags.some(tag => ['gym', 'fitness', 'yoga', 'workout', 'health'].includes(tag))) {
    category = 'fitness';
  }
  
  const images = VENUE_FALLBACK_IMAGES[category as keyof typeof VENUE_FALLBACK_IMAGES] || VENUE_FALLBACK_IMAGES.default;
  
  // Use venue ID or name to create a stable but varied selection
  const seed = venue.id || venue.name || 'default';
  const hash = seed.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const imageIndex = Math.abs(hash) % images.length;
  const selectedImage = images[imageIndex];
  
  // Debug logging to verify variety (only when needed)
  if (import.meta.env.DEV && venue.name?.includes('Test')) {
    console.log(`🖼️ Contextual image for "${venue.name}": ${category} (${imageIndex + 1}/${images.length})`);
  }
  
  return selectedImage;
}