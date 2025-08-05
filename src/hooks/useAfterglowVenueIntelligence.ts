/**
 * React Hook for Afterglow Venue Intelligence Integration
 * Enhances afterglow moments with venue intelligence data
 */

import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { AfterglowVenueIntelligence } from '@/lib/venue-intelligence/afterglowIntegration';

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

interface SocialIntelligenceData {
  friend_network_strength: number;
  mutual_connections: number;
  social_energy_level: 'low' | 'medium' | 'high';
}

interface EnhancedAfterglowMetadata {
  location: {
    coordinates?: [number, number];
    venue_name?: string;
    venue_id?: string;
    address?: string;
    distance_from_previous?: number;
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
    social_intelligence?: SocialIntelligenceData;
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

export function useAfterglowVenueIntelligence() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('useAfterglowVenueIntelligence: user', user?.id, 'isLoading', isLoading, 'error', error);

  // Initialize the venue intelligence service
  const venueIntelligence = useMemo(() => 
    new AfterglowVenueIntelligence(supabase), 
    []
  );

  /**
   * Enhance a single afterglow moment with venue intelligence
   */
  const enhanceAfterglowMoment = useCallback(async (momentId: string) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { success: false };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await venueIntelligence.enhanceAfterglowMoment(momentId, user.id);
      
      if (!result.success) {
        setError('Failed to enhance afterglow moment');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, venueIntelligence]);

  /**
   * Batch enhance multiple afterglow moments
   */
  const batchEnhanceAfterglowMoments = useCallback(async (momentIds: string[]) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { success: false, enhanced_count: 0 };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await venueIntelligence.batchEnhanceAfterglowMoments(momentIds, user.id);
      
      if (!result.success) {
        setError('Failed to enhance afterglow moments');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, enhanced_count: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, venueIntelligence]);

  /**
   * Get venue recommendations based on afterglow history
   */
  const getVenueRecommendationsFromHistory = useCallback(async (
    lat: number, 
    lng: number, 
    limit: number = 10
  ) => {
    if (!user?.id) {
      setError('User not authenticated');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const recommendations = await venueIntelligence.getVenueRecommendationsFromAfterglowHistory(
        user.id, 
        lat, 
        lng, 
        limit
      );

      return recommendations;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, venueIntelligence]);

  /**
   * Get enhanced afterglow moments with venue intelligence
   */
  const getEnhancedAfterglowMoments = useCallback(async (
    dailyAfterglowId?: string,
    limit: number = 50
  ): Promise<Array<{ id: string; metadata: EnhancedAfterglowMetadata; timestamp: string; title: string }>> => {
    if (!user?.id) {
      setError('User not authenticated');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('afterglow_moments')
        .select('id, metadata, timestamp, title')
        .eq('profile_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (dailyAfterglowId) {
        query = query.eq('daily_afterglow_id', dailyAfterglowId);
      }

      const { data: moments, error: momentsError } = await query;

      if (momentsError) throw momentsError;

      return moments?.map(moment => ({
        ...moment,
        metadata: moment.metadata as EnhancedAfterglowMetadata
      })) || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Auto-enhance recent afterglow moments that don't have venue intelligence
   */
  const autoEnhanceRecentMoments = useCallback(async (daysBack: number = 7) => {
    if (!user?.id) {
      setError('User not authenticated');
      return { success: false, enhanced_count: 0 };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get recent moments without venue intelligence
      const { data: moments, error: momentsError } = await supabase
        .from('afterglow_moments')
        .select('id, metadata')
        .eq('profile_id', user.id)
        .gte('timestamp', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(50);

      if (momentsError) throw momentsError;

      // Filter moments that don't have venue intelligence
      const momentsToEnhance = moments?.filter(moment => {
        const metadata = moment.metadata as EnhancedAfterglowMetadata;
        return metadata?.location && !metadata.location.venue_intelligence;
      }) || [];

      if (momentsToEnhance.length === 0) {
        return { success: true, enhanced_count: 0 };
      }

      // Batch enhance the moments
      const momentIds = momentsToEnhance.map(m => m.id);
      const result = await venueIntelligence.batchEnhanceAfterglowMoments(momentIds, user.id);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, enhanced_count: 0 };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, venueIntelligence]);

  /**
   * Get venue intelligence for a specific location (for real-time use)
   */
  const getVenueIntelligenceForLocation = useCallback(async (
    venueId?: string,
    coordinates?: [number, number],
    userVibes: string[] = []
  ): Promise<VenueIntelligenceData | null> => {
    if (!user?.id || (!venueId && !coordinates)) {
      return null;
    }

    try {
      const promises = [];

      // Get social proof
      if (venueId) {
        promises.push(
          supabase.functions.invoke('get-venue-intelligence', {
            body: {
              mode: 'social-proof',
              venue_id: venueId,
              user_id: user.id
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }

      // Get crowd intelligence
      if (venueId) {
        promises.push(
          supabase.functions.invoke('get-venue-intelligence', {
            body: {
              mode: 'crowd-intel',
              venue_id: venueId
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }

      // Get vibe match
      if (venueId) {
        promises.push(
          supabase.functions.invoke('get-venue-intelligence', {
            body: {
              mode: 'vibe-match',
              venue_id: venueId,
              user_id: user.id,
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
  }, [user?.id]);

  return {
    // State
    isLoading,
    error,
    
    // Actions
    enhanceAfterglowMoment,
    batchEnhanceAfterglowMoments,
    getVenueRecommendationsFromHistory,
    getEnhancedAfterglowMoments,
    autoEnhanceRecentMoments,
    getVenueIntelligenceForLocation,
    
    // Utils
    clearError: () => setError(null)
  };
}