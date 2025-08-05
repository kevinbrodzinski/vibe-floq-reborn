import { VibeSystemIntegration, type EnhancedPersonalHeroData, type EnhancedSocialContextData } from './VibeSystemIntegration';
import { useEnhancedLocationSharing } from '@/hooks/useEnhancedLocationSharing';
import { ProximityEventRecorder } from '@/lib/location/proximityEventRecorder';
import type { Vibe } from '@/types/vibes';

/**
 * Location-Enhanced Vibe Detection System
 * 
 * Integrates the optimized vibe detection with the enhanced location system
 * for superior accuracy and contextual awareness.
 */

// Enhanced location context for vibe analysis
export interface LocationEnhancedContext {
  // From your enhanced location system
  enhancedLocation: {
    coordinates: { lat: number; lng: number };
    accuracy: number;
    confidence: number;
    privacyLevel: 'private' | 'friends' | 'public';
    isInGeofence: boolean;
    geofenceType?: 'home' | 'work' | 'private';
  };
  
  // Venue detection from your system
  venueContext?: {
    venueId: string;
    venueName: string;
    confidence: number;
    detectionMethod: 'enhanced' | 'gps_fallback';
    wifiSignatures: string[];
    bluetoothSignatures: string[];
    stayDuration: number;
  };
  
  // Proximity data from your system
  proximityContext: {
    nearbyFriends: Array<{
      friendId: string;
      distance: number;
      confidence: 'high' | 'medium' | 'low';
      lastSeen: Date;
      proximityEvents: Array<{
        type: 'enter' | 'exit' | 'sustain';
        timestamp: Date;
        confidence: number;
      }>;
    }>;
    socialDensity: number;
    proximityScore: number;
  };
  
  // Enhanced environmental factors
  environmentalEnhancement: {
    locationStability: number; // How long you've been in this area
    movementPattern: 'stationary' | 'walking' | 'transit' | 'arriving' | 'leaving';
    socialContext: 'alone' | 'with_friends' | 'in_crowd' | 'social_gathering';
    venueType?: 'home' | 'work' | 'restaurant' | 'bar' | 'park' | 'gym' | 'other';
    timeAtLocation: number; // Minutes at current location
  };
}

export class LocationEnhancedVibeSystem extends VibeSystemIntegration {
  private proximityRecorder: ProximityEventRecorder;
  private locationHistory: Array<{ location: any; timestamp: Date; vibe: Vibe }> = [];
  private readonly LOCATION_HISTORY_LIMIT = 100;
  
  constructor() {
    super();
    this.proximityRecorder = new ProximityEventRecorder();
  }
  
  /**
   * Enhanced Personal Hero with Location Intelligence
   */
  async getLocationEnhancedPersonalHeroData(
    sensorData: any,
    enhancedLocationData: any // From useEnhancedLocationSharing
  ): Promise<EnhancedPersonalHeroData & {
    locationIntelligence: {
      currentVenue?: string;
      venueConfidence?: number;
      locationStability: number;
      privacyStatus: string;
      nearbyFriendsCount: number;
      optimalSocialTiming: boolean;
      locationBasedSuggestions: Array<{
        type: 'venue_change' | 'social_meetup' | 'privacy_adjustment';
        suggestion: string;
        confidence: number;
      }>;
    };
  }> {
    // Create enhanced context with location data
    const locationContext = this.buildLocationEnhancedContext(enhancedLocationData);
    
    // Get base personal hero data with enhanced context
    const baseData = await this.getEnhancedPersonalHeroData(sensorData, locationContext);
    
    // Add location-specific intelligence
    const locationIntelligence = await this.generateLocationIntelligence(
      locationContext,
      baseData.currentVibe
    );
    
    // Update location history for pattern analysis
    this.updateLocationHistory(enhancedLocationData.location, baseData.currentVibe);
    
    return {
      ...baseData,
      locationIntelligence,
      
      // Enhanced predictions with location context
      predictions: {
        ...baseData.predictions,
        locationBasedTransitions: await this.predictLocationBasedVibeTransitions(
          locationContext,
          baseData.currentVibe
        )
      },
      
      // Enhanced environmental factors with location data
      environmentalFactors: {
        ...baseData.environmentalFactors,
        locationStability: locationContext.environmentalEnhancement.locationStability,
        socialContext: locationContext.proximityContext.socialDensity,
        venueInfluence: locationContext.venueContext?.confidence || 0,
        privacyComfort: this.calculatePrivacyComfort(locationContext)
      }
    };
  }
  
  /**
   * Enhanced Social Context with Advanced Proximity Intelligence
   */
  async getLocationEnhancedSocialContextData(
    enhancedLocationData: any,
    currentVibe: Vibe,
    friends: any[]
  ): Promise<EnhancedSocialContextData & {
    proximityIntelligence: {
      confidenceScores: Record<string, number>;
      proximityTrends: Array<{
        friendId: string;
        trend: 'approaching' | 'stable' | 'departing';
        confidence: number;
        estimatedMeetupTime?: string;
      }>;
      optimalMeetupLocations: Array<{
        location: { lat: number; lng: number };
        reason: string;
        friendsInRange: string[];
        venueRecommendations: string[];
      }>;
      socialMomentum: {
        score: number;
        direction: 'building' | 'stable' | 'dispersing';
        peakTime?: string;
      };
    };
  }> {
    const locationContext = this.buildLocationEnhancedContext(enhancedLocationData);
    
    // Get base social context data
    const baseData = await this.getEnhancedSocialContextData(
      enhancedLocationData.location,
      currentVibe,
      friends
    );
    
    // Generate proximity intelligence
    const proximityIntelligence = await this.generateProximityIntelligence(
      locationContext,
      friends,
      currentVibe
    );
    
    // Enhanced hotspots with location confidence
    const enhancedHotspots = await this.enhanceHotspotsWithLocationData(
      baseData.hotspots,
      locationContext
    );
    
    return {
      ...baseData,
      hotspots: enhancedHotspots,
      proximityIntelligence,
      
      // Enhanced friend alignment with proximity confidence
      alignment: {
        ...baseData.alignment,
        friendMatches: baseData.alignment.friendMatches.map(match => ({
          ...match,
          proximityConfidence: this.getProximityConfidence(match.friendId, locationContext),
          estimatedArrivalTime: this.estimateArrivalTime(match.friendId, locationContext)
        }))
      }
    };
  }
  
  /**
   * Location-Aware Contextual Suggestions
   */
  async getLocationAwareContextualSuggestions(
    currentVibe: Vibe,
    enhancedLocationData: any,
    timeContext: any
  ): Promise<Array<{
    type: 'vibe_change' | 'location_change' | 'social_connection' | 'venue_recommendation' | 'privacy_adjustment';
    title: string;
    description: string;
    confidence: number;
    action: string;
    reasoning: string[];
    locationRelevance: number;
  }>> {
    const locationContext = this.buildLocationEnhancedContext(enhancedLocationData);
    const baseSuggestions = await this.getContextualSuggestions(currentVibe, enhancedLocationData.location, timeContext);
    
    // Add location-specific suggestions
    const locationSuggestions = [];
    
    // Venue-based vibe suggestions
    if (locationContext.venueContext && locationContext.venueContext.confidence > 0.7) {
      const venueVibeMatch = await this.getVenueVibeRecommendations(
        locationContext.venueContext,
        currentVibe
      );
      locationSuggestions.push(...venueVibeMatch);
    }
    
    // Social proximity suggestions
    if (locationContext.proximityContext.nearbyFriends.length > 0) {
      const socialSuggestions = await this.generateProximitySocialSuggestions(
        locationContext,
        currentVibe
      );
      locationSuggestions.push(...socialSuggestions);
    }
    
    // Privacy-based suggestions
    if (locationContext.enhancedLocation.isInGeofence) {
      const privacySuggestions = await this.generatePrivacyBasedSuggestions(
        locationContext,
        currentVibe
      );
      locationSuggestions.push(...privacySuggestions);
    }
    
    // Location stability suggestions
    if (locationContext.environmentalEnhancement.locationStability > 30) { // 30+ minutes
      const stabilityBasedSuggestions = await this.generateStabilityBasedSuggestions(
        locationContext,
        currentVibe
      );
      locationSuggestions.push(...stabilityBasedSuggestions);
    }
    
    // Combine and rank all suggestions
    const allSuggestions = [...baseSuggestions, ...locationSuggestions]
      .map(suggestion => ({
        ...suggestion,
        locationRelevance: this.calculateLocationRelevance(suggestion, locationContext)
      }))
      .sort((a, b) => (b.confidence * b.locationRelevance) - (a.confidence * a.locationRelevance));
    
    return allSuggestions.slice(0, 6); // Top 6 suggestions
  }
  
  /**
   * Enhanced User Interaction Recording with Location Context
   */
  async recordLocationEnhancedUserInteraction(
    interactionType: 'vibe_selection' | 'feedback' | 'correction' | 'venue_visit' | 'social_action' | 'proximity_event',
    data: any,
    enhancedLocationData: any
  ): Promise<void> {
    const locationContext = this.buildLocationEnhancedContext(enhancedLocationData);
    
    // Record base interaction
    await this.recordUserInteraction(interactionType, {
      ...data,
      locationContext: {
        venue: locationContext.venueContext,
        proximity: locationContext.proximityContext,
        privacy: locationContext.enhancedLocation.privacyLevel,
        geofence: locationContext.enhancedLocation.isInGeofence
      }
    });
    
    // Record proximity events if relevant
    if (interactionType === 'social_action' || interactionType === 'proximity_event') {
      await this.proximityRecorder.recordProximityEvent({
        profileId: data.profileId,
        friendId: data.friendId,
        eventType: data.eventType || 'interaction',
        location: enhancedLocationData.location,
        confidence: locationContext.proximityContext.proximityScore,
        metadata: {
          vibeContext: data.currentVibe,
          interactionType,
          venueContext: locationContext.venueContext?.venueName
        }
      });
    }
  }
  
  // Private helper methods
  
  private buildLocationEnhancedContext(enhancedLocationData: any): LocationEnhancedContext {
    return {
      enhancedLocation: {
        coordinates: enhancedLocationData.location,
        accuracy: enhancedLocationData.accuracy || 10,
        confidence: enhancedLocationData.confidence || 0.8,
        privacyLevel: enhancedLocationData.privacyLevel || 'public',
        isInGeofence: enhancedLocationData.isInGeofence || false,
        geofenceType: enhancedLocationData.geofenceType
      },
      
      venueContext: enhancedLocationData.venueDetection ? {
        venueId: enhancedLocationData.venueDetection.venueId,
        venueName: enhancedLocationData.venueDetection.venueName,
        confidence: enhancedLocationData.venueDetection.confidence,
        detectionMethod: enhancedLocationData.venueDetection.method,
        wifiSignatures: enhancedLocationData.venueDetection.wifiSignatures || [],
        bluetoothSignatures: enhancedLocationData.venueDetection.bluetoothSignatures || [],
        stayDuration: enhancedLocationData.venueDetection.stayDuration || 0
      } : undefined,
      
      proximityContext: {
        nearbyFriends: enhancedLocationData.proximityData?.nearbyFriends || [],
        socialDensity: enhancedLocationData.proximityData?.socialDensity || 0,
        proximityScore: enhancedLocationData.proximityData?.overallScore || 0
      },
      
      environmentalEnhancement: {
        locationStability: this.calculateLocationStability(enhancedLocationData),
        movementPattern: this.detectMovementPattern(enhancedLocationData),
        socialContext: this.determineSocialContext(enhancedLocationData),
        venueType: enhancedLocationData.venueDetection?.venueType,
        timeAtLocation: enhancedLocationData.timeAtLocation || 0
      }
    };
  }
  
  private async generateLocationIntelligence(
    locationContext: LocationEnhancedContext,
    currentVibe: Vibe
  ): Promise<any> {
    return {
      currentVenue: locationContext.venueContext?.venueName,
      venueConfidence: locationContext.venueContext?.confidence,
      locationStability: locationContext.environmentalEnhancement.locationStability,
      privacyStatus: locationContext.enhancedLocation.privacyLevel,
      nearbyFriendsCount: locationContext.proximityContext.nearbyFriends.length,
      optimalSocialTiming: this.isOptimalSocialTiming(locationContext),
      locationBasedSuggestions: await this.generateLocationBasedSuggestions(locationContext, currentVibe)
    };
  }
  
  private async generateProximityIntelligence(
    locationContext: LocationEnhancedContext,
    friends: any[],
    currentVibe: Vibe
  ): Promise<any> {
    const confidenceScores: Record<string, number> = {};
    const proximityTrends: any[] = [];
    
    locationContext.proximityContext.nearbyFriends.forEach(friend => {
      confidenceScores[friend.friendId] = friend.confidence === 'high' ? 0.9 : 
                                         friend.confidence === 'medium' ? 0.7 : 0.5;
      
      // Analyze proximity trend
      const trend = this.analyzeProximityTrend(friend.proximityEvents);
      proximityTrends.push({
        friendId: friend.friendId,
        trend: trend.direction,
        confidence: trend.confidence,
        estimatedMeetupTime: trend.estimatedMeetupTime
      });
    });
    
    return {
      confidenceScores,
      proximityTrends,
      optimalMeetupLocations: await this.findOptimalMeetupLocations(locationContext, friends),
      socialMomentum: this.calculateSocialMomentum(locationContext)
    };
  }
  
  private calculateLocationStability(enhancedLocationData: any): number {
    // Implementation would analyze location history and movement patterns
    return enhancedLocationData.timeAtLocation || 0;
  }
  
  private detectMovementPattern(enhancedLocationData: any): 'stationary' | 'walking' | 'transit' | 'arriving' | 'leaving' {
    // Implementation would analyze recent location changes and speed
    return 'stationary'; // Placeholder
  }
  
  private determineSocialContext(enhancedLocationData: any): 'alone' | 'with_friends' | 'in_crowd' | 'social_gathering' {
    const nearbyCount = enhancedLocationData.proximityData?.nearbyFriends?.length || 0;
    const socialDensity = enhancedLocationData.proximityData?.socialDensity || 0;
    
    if (nearbyCount === 0 && socialDensity < 5) return 'alone';
    if (nearbyCount > 0 && nearbyCount < 5) return 'with_friends';
    if (socialDensity > 20) return 'social_gathering';
    return 'in_crowd';
  }
  
  private calculatePrivacyComfort(locationContext: LocationEnhancedContext): number {
    // Higher score when in private geofences or with appropriate privacy settings
    if (locationContext.enhancedLocation.isInGeofence && 
        locationContext.enhancedLocation.geofenceType === 'home') {
      return 0.9;
    }
    
    if (locationContext.enhancedLocation.privacyLevel === 'private') {
      return 0.8;
    }
    
    return 0.6; // Default comfort level
  }
  
  private updateLocationHistory(location: any, vibe: Vibe): void {
    this.locationHistory.push({
      location,
      timestamp: new Date(),
      vibe
    });
    
    // Keep only recent history
    if (this.locationHistory.length > this.LOCATION_HISTORY_LIMIT) {
      this.locationHistory = this.locationHistory.slice(-this.LOCATION_HISTORY_LIMIT);
    }
  }
  
  // Additional helper methods would be implemented here...
  private async predictLocationBasedVibeTransitions(locationContext: any, currentVibe: Vibe): Promise<any> {
    // Implementation for location-based vibe predictions
    return [];
  }
  
  private async enhanceHotspotsWithLocationData(hotspots: any[], locationContext: any): Promise<any[]> {
    // Implementation for enhancing hotspots with location confidence
    return hotspots;
  }
  
  private getProximityConfidence(friendId: string, locationContext: any): number {
    // Implementation for getting proximity confidence
    return 0.8;
  }
  
  private estimateArrivalTime(friendId: string, locationContext: any): string | undefined {
    // Implementation for estimating friend arrival time
    return undefined;
  }
  
  private async getVenueVibeRecommendations(venueContext: any, currentVibe: Vibe): Promise<any[]> {
    // Implementation for venue-based vibe recommendations
    return [];
  }
  
  private async generateProximitySocialSuggestions(locationContext: any, currentVibe: Vibe): Promise<any[]> {
    // Implementation for proximity-based social suggestions
    return [];
  }
  
  private async generatePrivacyBasedSuggestions(locationContext: any, currentVibe: Vibe): Promise<any[]> {
    // Implementation for privacy-based suggestions
    return [];
  }
  
  private async generateStabilityBasedSuggestions(locationContext: any, currentVibe: Vibe): Promise<any[]> {
    // Implementation for location stability-based suggestions
    return [];
  }
  
  private calculateLocationRelevance(suggestion: any, locationContext: any): number {
    // Implementation for calculating location relevance of suggestions
    return 1.0;
  }
  
  private isOptimalSocialTiming(locationContext: any): boolean {
    // Implementation for determining optimal social timing
    return false;
  }
  
  private async generateLocationBasedSuggestions(locationContext: any, currentVibe: Vibe): Promise<any[]> {
    // Implementation for location-based suggestions
    return [];
  }
  
  private analyzeProximityTrend(events: any[]): any {
    // Implementation for analyzing proximity trends
    return { direction: 'stable', confidence: 0.7 };
  }
  
  private async findOptimalMeetupLocations(locationContext: any, friends: any[]): Promise<any[]> {
    // Implementation for finding optimal meetup locations
    return [];
  }
  
  private calculateSocialMomentum(locationContext: any): any {
    // Implementation for calculating social momentum
    return { score: 0.5, direction: 'stable' };
  }
}