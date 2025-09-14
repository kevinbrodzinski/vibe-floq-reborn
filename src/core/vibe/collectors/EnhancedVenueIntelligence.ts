import type { VenueIntelligence, VenueVibeProfile, EnhancedPlaceDetails } from '@/types/venues';
import { VENUE_VIBE_MAPPING } from '@/types/venues';
import type { Vibe } from '@/lib/vibes';
import { supabase } from '@/integrations/supabase/client';

type LngLat = { lat: number; lng: number };

/**
 * Enhanced venue intelligence that combines multiple data sources
 * to provide rich vibe predictions and venue context.
 */
export class EnhancedVenueIntelligence {
  private cache = new Map<string, VenueIntelligence>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive venue intelligence for a location
   */
  async getVenueIntelligence(location: LngLat): Promise<VenueIntelligence | null> {
    const cacheKey = this.getCacheKey(location);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    try {
      // Get enhanced place details
      const placeDetails = await this.getEnhancedPlaceDetails(location);
      if (!placeDetails) return null;

      // Get real-time venue metrics
      const realTimeMetrics = await this.getRealTimeMetrics(placeDetails.id);
      
      // Generate vibe profile from place data
      const vibeProfile = this.generateVibeProfile(placeDetails);
      
      const intelligence: VenueIntelligence = {
        venueId: placeDetails.id,
        name: placeDetails.displayName.text,
        location,
        category: this.categorizeVenue(placeDetails.types || []),
        vibeProfile,
        realTimeMetrics: realTimeMetrics || this.getDefaultRealTimeMetrics(vibeProfile),
        placeData: {
          isOpen: placeDetails.currentOpeningHours?.openNow ?? false,
          priceLevel: placeDetails.priceLevel,
          rating: placeDetails.rating,
          totalRatings: placeDetails.userRatingCount,
          photos: placeDetails.photos?.slice(0, 3).map(p => p.name) || []
        },
        lastUpdated: Date.now()
      };

      this.cache.set(cacheKey, intelligence);
      return intelligence;
    } catch (error) {
      console.error('Failed to get venue intelligence:', error);
      return null;
    }
  }

  /**
   * Get enhanced place details using Places API with normalized field handling
   */
  private async getEnhancedPlaceDetails(location: LngLat): Promise<EnhancedPlaceDetails | null> {
    try {
      // First find nearby places
      const { data, error } = await supabase.functions.invoke('venues-tile', {
        body: {
          center: [location.lng, location.lat],
          radius: 50, // 50m radius for precise location
          zoom: 18
        }
      });

      if (error || !data?.venues?.length) return null;

      const nearestVenue = data.venues[0];
      if (!nearestVenue.pid) return null;

      // Get detailed place information
      const { data: detailData, error: detailError } = await supabase.functions.invoke('venue-detail', {
        body: { pid: nearestVenue.pid }
      });

      if (detailError || !detailData?.venue) return null;

      // Transform to our enhanced schema with normalized fields
      return this.transformToEnhancedDetails(detailData.venue, nearestVenue);
    } catch (error) {
      console.error('Error fetching enhanced place details:', error);
      return null;
    }
  }

  /**
   * Transform venue detail response to enhanced place details with normalized fields
   */
  private transformToEnhancedDetails(venue: any, tileVenue: any): EnhancedPlaceDetails {
    // Normalize Google/FSQ field mismatches
    const rating = venue.rating ?? undefined;
    const userRatingCount = venue.user_ratings_total ?? venue.userRatingCount ?? undefined;
    const openNow = venue.hours?.open_now ?? tileVenue.open_now ?? false;
    
    return {
      id: venue.pid,
      displayName: { text: venue.name },
      formattedAddress: venue.address || '',
      types: venue.types || [],
      rating,
      userRatingCount,
      // Use place_id based URLs, avoid brittle cid approach
      googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${venue.pid}`,
      businessStatus: venue.business_status,
      priceLevel: venue.price_level ?? venue.price,
      currentOpeningHours: venue.hours ? {
        openNow,
        periods: venue.hours.periods,
        weekdayDescriptions: venue.hours.weekday_text
      } : undefined,
      photos: venue.photos?.map((url: string, index: number) => ({
        name: url,
        widthPx: 1280,
        heightPx: 720,
        authorAttributions: []
      })) || [],
      location: {
        latitude: tileVenue.lat,
        longitude: tileVenue.lng
      }
    };
  }

  /**
   * Get real-time venue metrics from our database
   */
  private async getRealTimeMetrics(venueId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('get-venue-intelligence', {
        body: { venue_id: venueId, mode: 'energy' }
      });

      if (error || !data) return null;

      return {
        currentOccupancy: Math.min(1, data.people_count / 50), // Normalize to 0-1
        averageSessionMinutes: data.avg_session_minutes || 30,
        dominantVibe: data.dominant_vibe as Vibe || 'chill',
        energyTrend: this.calculateEnergyTrend(data.energy_level)
      };
    } catch (error) {
      console.error('Error fetching real-time metrics:', error);
      return null;
    }
  }

  /**
   * Generate vibe profile from place details and real-time data with improved popularity calc
   */
  private generateVibeProfile(place: EnhancedPlaceDetails): VenueVibeProfile {
    const category = this.categorizeVenue(place.types || []);
    const baseProfile = VENUE_VIBE_MAPPING[category] || VENUE_VIBE_MAPPING.general;
    
    // Enhance with place-specific data
    let energyModifier = 0;
    let socialModifier = 0;
    let confidenceModifier = 0;

    // Rating influence (higher rating = more positive vibe)
    if (place.rating && place.userRatingCount) {
      if (place.rating > 4.0 && place.userRatingCount > 100) {
        energyModifier += 0.1;
        confidenceModifier += 0.2;
      }
    }

    // Price level influence
    if (place.priceLevel) {
      if (place.priceLevel >= 3) {
        // Expensive places often more romantic/upscale
        if (baseProfile.primaryVibe === 'social') {
          energyModifier += 0.1;
        }
      }
    }

    // Current status influence
    if (place.currentOpeningHours?.openNow) {
      energyModifier += 0.05; // Open venues slightly more energetic
    }

    // Reviews sentiment analysis (simplified)
    if (place.reviews && place.reviews.length > 0) {
      const avgRating = place.reviews.reduce((sum, r) => sum + r.rating, 0) / place.reviews.length;
      if (avgRating > 4.0) {
        confidenceModifier += 0.1;
      }
    }

    return {
      ...baseProfile,
      energyLevel: Math.min(1, Math.max(0, baseProfile.energyLevel + energyModifier)),
      socialFactor: Math.min(1, Math.max(0, baseProfile.socialFactor + socialModifier)),
      confidence: Math.min(1, Math.max(0, baseProfile.confidence + confidenceModifier))
    };
  }

  /**
   * Categorize venue from Google place types (strict typing)
   */
  private categorizeVenue(types: string[]): keyof typeof VENUE_VIBE_MAPPING {
    const typeStr = types.join(' ').toLowerCase();
    
    if (types.some(t => ['night_club', 'dance_club'].includes(t))) return 'nightclub';
    if (types.some(t => ['bar', 'pub', 'liquor_store'].includes(t))) return 'bar';
    if (types.some(t => ['coffee', 'cafe'].includes(t))) return 'coffee';
    if (types.some(t => ['gym', 'fitness', 'spa'].includes(t))) return 'gym';
    if (types.some(t => ['park', 'tourist_attraction'].includes(t))) return 'park';
    if (types.some(t => ['restaurant', 'food', 'meal_takeaway'].includes(t))) return 'restaurant';
    if (types.some(t => ['office', 'coworking', 'workplace'].includes(t))) return 'office';
    
    return 'general';
  }

  /**
   * Calculate energy trend from current metrics
   */
  private calculateEnergyTrend(energyLevel: number): 'rising' | 'stable' | 'declining' {
    // Simplified trend calculation - in production this would use historical data
    const hour = new Date().getHours();
    
    if (hour >= 18 && hour <= 22) return 'rising'; // Evening peak
    if (hour >= 6 && hour <= 10) return 'rising';  // Morning rise
    if (hour >= 23 || hour <= 5) return 'declining'; // Late night decline
    
    return 'stable';
  }

  /**
   * Get default real-time metrics when live data unavailable
   */
  private getDefaultRealTimeMetrics(vibeProfile: VenueVibeProfile) {
    const hour = new Date().getHours();
    const timeKey = hour < 6 ? 'night' : 
                   hour < 12 ? 'morning' : 
                   hour < 17 ? 'afternoon' : 
                   hour < 22 ? 'evening' : 'night';
    
    const timePreference = vibeProfile.timeOfDayPreferences[timeKey];
    
    return {
      currentOccupancy: timePreference * 0.7, // Estimate based on time preference
      averageSessionMinutes: vibeProfile.socialFactor > 0.6 ? 45 : 25,
      dominantVibe: vibeProfile.primaryVibe,
      energyTrend: this.calculateEnergyTrend(vibeProfile.energyLevel)
    };
  }

  /**
   * Generate cache key for location (consistent 250m grid)
   */
  private getCacheKey(location: LngLat): string {
    // Use consistent 250m grid for API cost control
    const sz = 0.0022; // ~250m lat
    const scale = Math.max(0.25, Math.cos((location.lat * Math.PI) / 180));
    const lat = Math.round(location.lat / sz) * sz;
    const lng = Math.round((location.lng * scale) / sz) * (sz / scale);
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }

  /**
   * Check if cached intelligence is still valid
   */
  private isCacheValid(intelligence: VenueIntelligence): boolean {
    return Date.now() - intelligence.lastUpdated < this.CACHE_TTL_MS;
  }

  /**
   * Clear expired cache entries with jitter to prevent thundering herds
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    // Add small jitter to prevent thundering herds
    const jitter = Math.random() * 30000; // Up to 30 seconds
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.lastUpdated > this.CACHE_TTL_MS + jitter) {
        this.cache.delete(key);
      }
    }
  }
}