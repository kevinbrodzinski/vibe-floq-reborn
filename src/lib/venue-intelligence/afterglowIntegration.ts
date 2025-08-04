/**
 * Afterglow Integration for Venue Intelligence
 * Enhances Phase 4 afterglow moments with venue intelligence data
 */

import { createClient } from '@supabase/supabase-js';

interface VenueIntelligenceData {
  vibe_match: {
    score: number;
    explanation: string;
    user_vibes: string[];
    venue_vibes: string[];
  };
  social_proof: {
    friend_visits: number;
    recent_visitors: string[];
    network_rating: number;
    popular_with: string;
  };
  crowd_intelligence: {
    current_capacity: number;
    predicted_peak: string;
    typical_crowd: string;
    best_time_to_visit: string;
  };
}

interface EnhancedAfterglowMetadata {
  location: {
    coordinates?: [number, number];
    venue_name?: string;
    venue_id?: string;
    address?: string;
    distance_from_previous?: number;
    // Enhanced with venue intelligence
    venue_intelligence?: VenueIntelligenceData;
  };
  people: {
    count: number;
    encountered_users: Array<{
      profile_id: string;
      interaction_strength: number;
      shared_duration: number;
      interaction_type: string;
    }>;
    // Enhanced with social context
    social_intelligence?: {
      friend_network_strength: number;
      mutual_connections: number;
      social_energy_level: 'low' | 'medium' | 'high';
    };
  };
  social_context?: {
    floq_id?: string;
    group_activities?: string[];
    social_energy?: number;
  };
  vibe: {
    primary: string;
    intensity: number;
    secondary_vibes?: string[];
  };
}

export class AfterglowVenueIntelligence {
  private supabase: ReturnType<typeof createClient>;
  
  constructor(supabase: ReturnType<typeof createClient>) {
    this.supabase = supabase;
  }

  /**
   * Enhance existing afterglow moment with venue intelligence
   */
  async enhanceAfterglowMoment(
    momentId: string,
    userId: string
  ): Promise<{ success: boolean; enhanced_metadata?: EnhancedAfterglowMetadata }> {
    try {
      // Get existing moment
      const { data: moment, error: momentError } = await this.supabase
        .from('afterglow_moments')
        .select('metadata, location_geom')
        .eq('id', momentId)
        .eq('profile_id', userId)
        .single();

      if (momentError || !moment) {
        return { success: false };
      }

      const existingMetadata = moment.metadata as EnhancedAfterglowMetadata;
      
      // Extract venue information
      const venueId = existingMetadata?.location?.venue_id;
      const coordinates = existingMetadata?.location?.coordinates;
      
      if (!venueId && !coordinates) {
        return { success: false };
      }

      // Get venue intelligence data
      const venueIntelligence = await this.getVenueIntelligenceForLocation(
        venueId,
        coordinates,
        userId,
        existingMetadata?.vibe?.primary ? [existingMetadata.vibe.primary] : []
      );

      // Get social intelligence for people encountered
      const socialIntelligence = await this.getSocialIntelligenceForPeople(
        existingMetadata?.people?.encountered_users || [],
        userId
      );

      // Create enhanced metadata
      const enhancedMetadata: EnhancedAfterglowMetadata = {
        ...existingMetadata,
        location: {
          ...existingMetadata.location,
          venue_intelligence: venueIntelligence
        },
        people: {
          ...existingMetadata.people,
          social_intelligence: socialIntelligence
        }
      };

      // Update the moment with enhanced metadata
      const { error: updateError } = await this.supabase
        .from('afterglow_moments')
        .update({ metadata: enhancedMetadata })
        .eq('id', momentId)
        .eq('profile_id', userId);

      if (updateError) {
        console.error('Error updating afterglow moment:', updateError);
        return { success: false };
      }

      return { success: true, enhanced_metadata: enhancedMetadata };
    } catch (error) {
      console.error('Error enhancing afterglow moment:', error);
      return { success: false };
    }
  }

  /**
   * Get venue intelligence for a location
   */
  private async getVenueIntelligenceForLocation(
    venueId?: string,
    coordinates?: [number, number],
    userId?: string,
    userVibes: string[] = []
  ): Promise<VenueIntelligenceData | null> {
    if (!venueId && !coordinates) return null;

    try {
      const promises = [];

      // Get social proof if we have venue_id and user_id
      if (venueId && userId) {
        promises.push(
          this.supabase.functions.invoke('get-venue-intelligence', {
            body: {
              mode: 'social-proof',
              venue_id: venueId,
              user_id: userId
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }

      // Get crowd intelligence if we have venue_id
      if (venueId) {
        promises.push(
          this.supabase.functions.invoke('get-venue-intelligence', {
            body: {
              mode: 'crowd-intel',
              venue_id: venueId
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }

      // Get vibe match if we have venue_id and user_id
      if (venueId && userId) {
        promises.push(
          this.supabase.functions.invoke('get-venue-intelligence', {
            body: {
              mode: 'vibe-match',
              venue_id: venueId,
              user_id: userId,
              user_vibes: userVibes
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }

      const [socialProofResult, crowdIntelResult, vibeMatchResult] = await Promise.all(promises);

      return {
        vibe_match: vibeMatchResult.data?.vibe_match || {
          score: 0.5,
          explanation: 'No vibe data available',
          user_vibes: userVibes,
          venue_vibes: []
        },
        social_proof: socialProofResult.data?.social_proof || {
          friend_visits: 0,
          recent_visitors: [],
          network_rating: 0,
          popular_with: 'New location'
        },
        crowd_intelligence: crowdIntelResult.data?.crowd_intelligence || {
          current_capacity: 0,
          predicted_peak: '8:00 PM',
          typical_crowd: 'Unknown',
          best_time_to_visit: 'Anytime'
        }
      };
    } catch (error) {
      console.error('Error getting venue intelligence:', error);
      return null;
    }
  }

  /**
   * Get social intelligence for encountered people
   */
  private async getSocialIntelligenceForPeople(
    encounteredUsers: Array<{ profile_id: string; interaction_strength: number }>,
    userId: string
  ): Promise<{ friend_network_strength: number; mutual_connections: number; social_energy_level: 'low' | 'medium' | 'high' }> {
    if (!encounteredUsers.length || !userId) {
      return {
        friend_network_strength: 0,
        mutual_connections: 0,
        social_energy_level: 'low'
      };
    }

    try {
      // Check how many encountered users are friends
      const friendChecks = await Promise.all(
        encounteredUsers.map(async (user) => {
          const { data: isFriend } = await this.supabase.rpc('are_friends', {
            user_a: userId,
            user_b: user.profile_id
          });
          return { ...user, is_friend: isFriend };
        })
      );

      const friendCount = friendChecks.filter(check => check.is_friend).length;
      const totalInteractionStrength = encounteredUsers.reduce(
        (sum, user) => sum + user.interaction_strength, 0
      );

      const averageStrength = totalInteractionStrength / encounteredUsers.length;
      const friendNetworkStrength = friendCount / encounteredUsers.length;

      let socialEnergyLevel: 'low' | 'medium' | 'high' = 'low';
      if (encounteredUsers.length > 10 && averageStrength > 0.7) {
        socialEnergyLevel = 'high';
      } else if (encounteredUsers.length > 5 && averageStrength > 0.5) {
        socialEnergyLevel = 'medium';
      }

      return {
        friend_network_strength: friendNetworkStrength,
        mutual_connections: friendCount,
        social_energy_level: socialEnergyLevel
      };
    } catch (error) {
      console.error('Error getting social intelligence:', error);
      return {
        friend_network_strength: 0,
        mutual_connections: 0,
        social_energy_level: 'low'
      };
    }
  }

  /**
   * Batch enhance multiple afterglow moments
   */
  async batchEnhanceAfterglowMoments(
    momentIds: string[],
    userId: string
  ): Promise<{ success: boolean; enhanced_count: number }> {
    let enhancedCount = 0;

    for (const momentId of momentIds) {
      const result = await this.enhanceAfterglowMoment(momentId, userId);
      if (result.success) {
        enhancedCount++;
      }
    }

    return {
      success: enhancedCount > 0,
      enhanced_count: enhancedCount
    };
  }

  /**
   * Get venue recommendations based on afterglow history
   */
  async getVenueRecommendationsFromAfterglowHistory(
    userId: string,
    lat: number,
    lng: number,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // Get user's afterglow patterns
      const { data: moments, error: momentsError } = await this.supabase
        .from('afterglow_moments')
        .select('metadata')
        .eq('profile_id', userId)
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(50);

      if (momentsError || !moments?.length) {
        // Fallback to basic recommendations
        const { data: recommendations } = await this.supabase.functions.invoke('get-venue-intelligence', {
          body: {
            mode: 'recommendations',
            user_id: userId,
            lat: lat,
            lng: lng,
            limit: limit
          }
        });
        return recommendations?.recommendations || [];
      }

      // Extract user preferences from afterglow history
      const vibePreferences = new Map<string, number>();
      const venueTypePreferences = new Map<string, number>();

      moments.forEach(moment => {
        const metadata = moment.metadata as EnhancedAfterglowMetadata;
        
        // Track vibe preferences
        if (metadata.vibe?.primary) {
          vibePreferences.set(
            metadata.vibe.primary,
            (vibePreferences.get(metadata.vibe.primary) || 0) + 1
          );
        }

        // Track venue type preferences from location intelligence
        if (metadata.location?.venue_intelligence?.vibe_match?.venue_vibes) {
          metadata.location.venue_intelligence.vibe_match.venue_vibes.forEach(vibe => {
            venueTypePreferences.set(vibe, (venueTypePreferences.get(vibe) || 0) + 1);
          });
        }
      });

      // Get top preferences
      const topVibes = Array.from(vibePreferences.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([vibe]) => vibe);

      // Get recommendations with user preferences
      const { data: recommendations } = await this.supabase.functions.invoke('get-venue-intelligence', {
        body: {
          mode: 'recommendations',
          user_id: userId,
          lat: lat,
          lng: lng,
          user_vibes: topVibes,
          limit: limit
        }
      });

      return recommendations?.recommendations || [];
    } catch (error) {
      console.error('Error getting venue recommendations from afterglow history:', error);
      return [];
    }
  }
}