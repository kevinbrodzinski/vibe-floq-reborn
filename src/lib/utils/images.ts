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