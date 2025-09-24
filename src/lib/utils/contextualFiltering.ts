import { PulseFilterContext } from '@/hooks/usePulseFilters';

export interface VenueData {
  id: string;
  name: string;
  categories?: string[];
  canonical_tags?: string[];
  hours?: {
    [key: string]: string; // e.g., "monday": "9:00-22:00"
  };
  price_level?: number;
  rating?: number;
  live_count?: number;
  distance_m?: number;
}

export interface ContextualFilterOptions {
  context: PulseFilterContext;
  selectedPillKeys: string[];
  currentTime?: Date;
  userPreferences?: {
    priceRange?: [number, number];
    minimumRating?: number;
    maxDistance?: number;
  };
}

/**
 * Determines if a venue is currently open based on its hours and current time
 */
export function isVenueOpen(venue: VenueData, currentTime: Date = new Date()): boolean | null {
  if (!venue.hours) return null; // Unknown hours
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[currentTime.getDay()];
  const hoursString = venue.hours[currentDay];
  
  if (!hoursString || hoursString.toLowerCase() === 'closed') return false;
  if (hoursString.toLowerCase() === '24/7' || hoursString.toLowerCase() === 'open') return true;
  
  try {
    // Parse hours like "9:00-22:00" or "9:00-2:00" (next day)
    const [openTime, closeTime] = hoursString.split('-');
    if (!openTime || !closeTime) return null;
    
    const [openHour, openMin] = openTime.split(':').map(Number);
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    const currentTotalMin = currentHour * 60 + currentMin;
    const openTotalMin = openHour * 60 + openMin;
    let closeTotalMin = closeHour * 60 + closeMin;
    
    // Handle next-day closing (e.g., 22:00-2:00)
    if (closeTotalMin < openTotalMin) {
      closeTotalMin += 24 * 60; // Add 24 hours
      if (currentTotalMin < openTotalMin) {
        // We're in the early morning of the next day
        return currentTotalMin <= (closeTotalMin - 24 * 60);
      }
    }
    
    return currentTotalMin >= openTotalMin && currentTotalMin <= closeTotalMin;
  } catch {
    return null; // Parsing error
  }
}

/**
 * Gets venue opening status with context
 */
export function getVenueStatus(venue: VenueData, currentTime: Date = new Date()): {
  isOpen: boolean | null;
  status: 'open' | 'closed' | 'closing_soon' | 'opening_soon' | 'unknown';
  timeUntilChange?: number; // minutes
} {
  const isOpen = isVenueOpen(venue, currentTime);
  
  if (isOpen === null) {
    return { isOpen: null, status: 'unknown' };
  }
  
  if (isOpen) {
    // Check if closing soon (within 1 hour)
    const timeUntilClose = getTimeUntilClose(venue, currentTime);
    if (timeUntilClose !== null && timeUntilClose <= 60) {
      return { isOpen: true, status: 'closing_soon', timeUntilChange: timeUntilClose };
    }
    return { isOpen: true, status: 'open' };
  } else {
    // Check if opening soon (within 2 hours)
    const timeUntilOpen = getTimeUntilOpen(venue, currentTime);
    if (timeUntilOpen !== null && timeUntilOpen <= 120) {
      return { isOpen: false, status: 'opening_soon', timeUntilChange: timeUntilOpen };
    }
    return { isOpen: false, status: 'closed' };
  }
}

/**
 * Gets minutes until venue closes
 */
function getTimeUntilClose(venue: VenueData, currentTime: Date): number | null {
  if (!venue.hours) return null;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[currentTime.getDay()];
  const hoursString = venue.hours[currentDay];
  
  if (!hoursString || hoursString.toLowerCase() === 'closed') return null;
  if (hoursString.toLowerCase() === '24/7') return null; // Never closes
  
  try {
    const [, closeTime] = hoursString.split('-');
    if (!closeTime) return null;
    
    const [closeHour, closeMin] = closeTime.split(':').map(Number);
    const currentHour = currentTime.getHours();
    const currentMin = currentTime.getMinutes();
    
    let closeTotalMin = closeHour * 60 + closeMin;
    const currentTotalMin = currentHour * 60 + currentMin;
    
    // Handle next-day closing
    if (closeTotalMin <= currentTotalMin) {
      closeTotalMin += 24 * 60;
    }
    
    return closeTotalMin - currentTotalMin;
  } catch {
    return null;
  }
}

/**
 * Gets minutes until venue opens
 */
function getTimeUntilOpen(venue: VenueData, currentTime: Date): number | null {
  if (!venue.hours) return null;
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  let checkDay = currentTime.getDay();
  let checkDate = new Date(currentTime);
  
  // Check today and next 7 days
  for (let i = 0; i < 7; i++) {
    const dayName = dayNames[checkDay];
    const hoursString = venue.hours[dayName];
    
    if (hoursString && hoursString.toLowerCase() !== 'closed') {
      if (hoursString.toLowerCase() === '24/7') return 0;
      
      try {
        const [openTime] = hoursString.split('-');
        if (!openTime) continue;
        
        const [openHour, openMin] = openTime.split(':').map(Number);
        const openTotalMin = openHour * 60 + openMin;
        
        if (i === 0) {
          // Today
          const currentTotalMin = currentTime.getHours() * 60 + currentTime.getMinutes();
          if (openTotalMin > currentTotalMin) {
            return openTotalMin - currentTotalMin;
          }
        } else {
          // Future day
          return (i * 24 * 60) + openTotalMin - (currentTime.getHours() * 60 + currentTime.getMinutes());
        }
      } catch {
        continue;
      }
    }
    
    checkDay = (checkDay + 1) % 7;
  }
  
  return null;
}

/**
 * Applies contextual filtering to venues based on time, weather, and user context
 */
export function applyContextualFiltering(
  venues: VenueData[],
  options: ContextualFilterOptions
): VenueData[] {
  const { context, selectedPillKeys, currentTime = new Date(), userPreferences = {} } = options;
  
  return venues.filter(venue => {
    // 1. Basic pill filtering (existing logic)
    if (selectedPillKeys.length > 0) {
      const venueTags = venue.canonical_tags || venue.categories || [];
      const hasMatchingTag = selectedPillKeys.some(key => 
        venueTags.some(tag => tag.toLowerCase().includes(key.toLowerCase()) || 
                             key.toLowerCase().includes(tag.toLowerCase()))
      );
      if (!hasMatchingTag) return false;
    }
    
    // 2. Context-aware filtering
    
    // Time-based filtering: prefer open venues, but don't completely exclude closed ones
    const venueStatus = getVenueStatus(venue, currentTime);
    
    // Weather-based filtering
    if (context.weather === 'bad') {
      // In bad weather, prefer indoor venues
      const isOutdoor = venue.canonical_tags?.some(tag => 
        ['outdoor', 'rooftop', 'patio', 'beach', 'park'].includes(tag.toLowerCase())
      );
      // Don't completely exclude outdoor venues, but deprioritize them
    }
    
    // Time of day contextual filtering
    if (context.timeOfDay === 'morning') {
      // Morning: prefer cafes, breakfast spots, gyms
      const isMorningVenue = venue.canonical_tags?.some(tag =>
        ['cafe', 'coffee', 'breakfast', 'gym', 'fitness', 'bakery'].includes(tag.toLowerCase())
      );
      // Don't exclude non-morning venues, just note the preference
    } else if (context.timeOfDay === 'lateNight') {
      // Late night: prefer bars, clubs, late-night food
      const isLateNightVenue = venue.canonical_tags?.some(tag =>
        ['bar', 'club', 'nightlife', 'late_night', '24_hour'].includes(tag.toLowerCase())
      );
      // Don't exclude other venues, just note the preference
    }
    
    // User preference filtering
    if (userPreferences.minimumRating && venue.rating) {
      if (venue.rating < userPreferences.minimumRating) return false;
    }
    
    if (userPreferences.maxDistance && venue.distance_m) {
      if (venue.distance_m > userPreferences.maxDistance) return false;
    }
    
    if (userPreferences.priceRange && venue.price_level) {
      const [minPrice, maxPrice] = userPreferences.priceRange;
      if (venue.price_level < minPrice || venue.price_level > maxPrice) return false;
    }
    
    return true;
  });
}

/**
 * Sorts venues based on contextual relevance
 */
export function sortByContextualRelevance(
  venues: VenueData[],
  options: ContextualFilterOptions
): VenueData[] {
  const { context, currentTime = new Date() } = options;
  
  return venues.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // 1. Open venues get priority
    const statusA = getVenueStatus(a, currentTime);
    const statusB = getVenueStatus(b, currentTime);
    
    if (statusA.isOpen === true) scoreA += 100;
    if (statusB.isOpen === true) scoreB += 100;
    
    if (statusA.status === 'opening_soon') scoreA += 50;
    if (statusB.status === 'opening_soon') scoreB += 50;
    
    // 2. Weather-based scoring
    if (context.weather === 'good') {
      // Boost outdoor venues in good weather
      const isOutdoorA = a.canonical_tags?.some(tag => 
        ['outdoor', 'rooftop', 'patio', 'beach', 'park'].includes(tag.toLowerCase())
      );
      const isOutdoorB = b.canonical_tags?.some(tag => 
        ['outdoor', 'rooftop', 'patio', 'beach', 'park'].includes(tag.toLowerCase())
      );
      if (isOutdoorA) scoreA += 30;
      if (isOutdoorB) scoreB += 30;
    } else if (context.weather === 'bad') {
      // Boost indoor venues in bad weather
      const isIndoorA = a.canonical_tags?.some(tag => 
        ['indoor', 'cozy', 'covered', 'mall', 'museum'].includes(tag.toLowerCase())
      );
      const isIndoorB = b.canonical_tags?.some(tag => 
        ['indoor', 'cozy', 'covered', 'mall', 'museum'].includes(tag.toLowerCase())
      );
      if (isIndoorA) scoreA += 30;
      if (isIndoorB) scoreB += 30;
    }
    
    // 3. Time of day scoring
    if (context.timeOfDay === 'morning') {
      const isMorningA = a.canonical_tags?.some(tag =>
        ['cafe', 'coffee', 'breakfast', 'gym', 'fitness', 'bakery'].includes(tag.toLowerCase())
      );
      const isMorningB = b.canonical_tags?.some(tag =>
        ['cafe', 'coffee', 'breakfast', 'gym', 'fitness', 'bakery'].includes(tag.toLowerCase())
      );
      if (isMorningA) scoreA += 40;
      if (isMorningB) scoreB += 40;
    } else if (context.timeOfDay === 'evening') {
      const isEveningA = a.canonical_tags?.some(tag =>
        ['restaurant', 'dinner', 'bar', 'music', 'entertainment'].includes(tag.toLowerCase())
      );
      const isEveningB = b.canonical_tags?.some(tag =>
        ['restaurant', 'dinner', 'bar', 'music', 'entertainment'].includes(tag.toLowerCase())
      );
      if (isEveningA) scoreA += 40;
      if (isEveningB) scoreB += 40;
    } else if (context.timeOfDay === 'lateNight') {
      const isLateNightA = a.canonical_tags?.some(tag =>
        ['bar', 'club', 'nightlife', 'late_night', '24_hour'].includes(tag.toLowerCase())
      );
      const isLateNightB = b.canonical_tags?.some(tag =>
        ['bar', 'club', 'nightlife', 'late_night', '24_hour'].includes(tag.toLowerCase())
      );
      if (isLateNightA) scoreA += 40;
      if (isLateNightB) scoreB += 40;
    }
    
    // 4. Activity level (live_count) scoring
    if (a.live_count && b.live_count) {
      scoreA += Math.min(a.live_count * 5, 25); // Cap at 25 points
      scoreB += Math.min(b.live_count * 5, 25);
    }
    
    // 5. Distance scoring (closer is better)
    if (a.distance_m && b.distance_m) {
      const maxDistance = Math.max(a.distance_m, b.distance_m);
      scoreA += Math.max(0, 20 - (a.distance_m / maxDistance) * 20);
      scoreB += Math.max(0, 20 - (b.distance_m / maxDistance) * 20);
    }
    
    // 6. Rating scoring
    if (a.rating) scoreA += (a.rating / 5) * 15;
    if (b.rating) scoreB += (b.rating / 5) * 15;
    
    return scoreB - scoreA; // Higher score first
  });
}