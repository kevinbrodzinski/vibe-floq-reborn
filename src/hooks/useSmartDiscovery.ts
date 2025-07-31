import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { DISCOVERY_CONFIG } from '@/config/discovery';
import { VenueSchema, FloqSchema, AiSuggestionSchema } from '@/schemas/discovery';
import { 
  createDiscoveryQueryKey, 
  matchesActivity, 
  getPriceForBudget, 
  getFloqStatus,
  calculateRecommendationScore 
} from '@/utils/discovery';
import { DiscoveryError, type DiscoveryFilters, type SmartRecommendation } from '@/types/discovery';

// Re-export types for backward compatibility
export type { DiscoveryFilters, SmartRecommendation };

export const useSmartDiscovery = (
  userLocation: { lat: number; lng: number } | null,
  filters: DiscoveryFilters
) => {
  const { user } = useAuth();

  // Stabilize query key to prevent cache thrashing
  const queryKey = useMemo(() => 
    createDiscoveryQueryKey(userLocation, filters, user?.id),
    [userLocation?.lat, userLocation?.lng, filters.radius, filters.vibe, filters.activityType, filters.groupSize, filters.budget, user?.id]
  );

  return useQuery({
    queryKey,
    enabled: !!userLocation,
    staleTime: DISCOVERY_CONFIG.STALE_TIME_MS,
    queryFn: async ({ signal }): Promise<SmartRecommendation[]> => {
      if (!userLocation) return [];

      const recommendations: SmartRecommendation[] = [];

      try {
        // Create timeout for requests
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new DiscoveryError('Request timeout', 'NETWORK_ERROR')), DISCOVERY_CONFIG.REQUEST_TIMEOUT_MS)
        );

        // Execute all requests in parallel with proper error handling
        const [venuesResult, floqsResult, aiSuggestionsResult] = await Promise.allSettled([
          // 1. Get nearby venues
          Promise.race([
            supabase.rpc('venues_within_radius', {
              center_lat: userLocation.lat,
              center_lng: userLocation.lng,
              r_m: filters.radius // Remove the * 1000 - RPC expects meters
            }),
            timeoutPromise
          ]),
          
          // 2. Get nearby floqs using the new RPC
          Promise.race([
            supabase.rpc('get_nearby_floqs', {
              p_lat: userLocation.lat,
              p_lng: userLocation.lng,
              p_radius_m: filters.radius,
              p_primary_vibe: filters.vibe === 'all' ? null : filters.vibe as any,
              p_limit: DISCOVERY_CONFIG.DEFAULT_LIMIT
            }),
            timeoutPromise
          ]),
          
          // 3. Get AI suggestions  
          user ? Promise.race([
            supabase.functions.invoke('get-social-suggestions', {
              body: {
                radius: filters.radius, // Pass radius in meters
                limit: DISCOVERY_CONFIG.DEFAULT_LIMIT
              }
            }),
            timeoutPromise
          ]) : Promise.resolve({ data: null, error: null })
        ]);

        // Process venues
        if (venuesResult.status === 'fulfilled' && venuesResult.value && typeof venuesResult.value === 'object' && 'data' in venuesResult.value && venuesResult.value.data) {
          try {
            const validatedVenues = (venuesResult.value.data as any[]).map((venue: any) => VenueSchema.parse(venue));
            
            const filteredVenues = validatedVenues.filter(venue => matchesActivity(venue, filters.activityType));
            
            const venueRecommendations: SmartRecommendation[] = filteredVenues.map(venue => {
              const recommendation = {
                id: venue.id,
                title: venue.name,
                type: 'venue' as const,
                distance: venue.distance_m,
                vibe: venue.vibe || filters.vibe,
                status: 'open' as const,
                description: venue.description || `${venue.categories.join(', ') || 'Local venue'}`,
                location: venue.address || 'Nearby',
                price: getPriceForBudget(filters.budget, venue.rating),
                rating: venue.rating,
                venueType: venue.categories[0] || 'venue',
                tags: venue.categories,
                address: venue.address,
                categories: venue.categories,
                photo_url: venue.photo_url,
                live_count: venue.live_count,
                isFavorite: false,
                isWatching: false
              };
              
              return {
                ...recommendation,
                score: calculateRecommendationScore(recommendation)
              };
            });
            
            recommendations.push(...venueRecommendations);
          } catch (validationError) {
            console.warn('Venue validation failed:', validationError);
          }
        }

        // Process floqs
        if (floqsResult.status === 'fulfilled' && floqsResult.value && typeof floqsResult.value === 'object' && 'data' in floqsResult.value && floqsResult.value.data) {
          try {
            const validatedFloqs = (floqsResult.value.data as any[]).map((floq: any) => FloqSchema.parse(floq));
            
            const filteredFloqs = validatedFloqs.filter(floq => {
              if (filters.vibe && floq.primary_vibe !== filters.vibe) return false;
              if (filters.groupSize > 1 && floq.participant_count < 2) return false;
              return true;
            });
            
            const floqRecommendations: SmartRecommendation[] = filteredFloqs.map(floq => {
              const recommendation = {
                id: floq.id,
                title: floq.title,
                type: 'floq' as const,
                distance: floq.distance_m,
                vibe: floq.primary_vibe || filters.vibe,
                participants: floq.participant_count,
                maxParticipants: floq.max_participants,
                status: getFloqStatus(floq),
                description: floq.description || `Join this ${floq.primary_vibe} floq`,
                location: floq.address || 'Nearby',
                startTime: floq.starts_at,
                endTime: floq.ends_at,
                host: {
                  name: floq.creator_name || 'Local Host',
                  avatar: floq.creator_avatar
                },
                spotsLeft: floq.max_participants ? floq.max_participants - floq.participant_count : undefined,
                tags: [floq.primary_vibe || 'social', 'community'],
                isFavorite: false,
                isWatching: false,
                isRSVPd: floq.is_joined
              };
              
              return {
                ...recommendation,
                score: calculateRecommendationScore(recommendation)
              };
            });
            
            recommendations.push(...floqRecommendations);
          } catch (validationError) {
            console.warn('Floq validation failed:', validationError);
          }
        }

        // Process AI suggestions
        if (aiSuggestionsResult.status === 'fulfilled' && aiSuggestionsResult.value && typeof aiSuggestionsResult.value === 'object' && 'data' in aiSuggestionsResult.value && aiSuggestionsResult.value.data) {
          try {
            const aiData = Array.isArray((aiSuggestionsResult.value as any).data) 
              ? (aiSuggestionsResult.value as any).data 
              : [];
              
            const validatedSuggestions = aiData.map((suggestion: any) => AiSuggestionSchema.parse(suggestion));
            
            const aiRecommendations: SmartRecommendation[] = validatedSuggestions.map(suggestion => ({
              id: `ai-${suggestion.id}`,
              title: suggestion.title,
              type: suggestion.type,
              distance: suggestion.distance,
              vibe: suggestion.vibe || filters.vibe,
              status: 'upcoming' as const,
              description: suggestion.description || 'AI-recommended based on your preferences',
              location: suggestion.location || 'Nearby',
              rating: suggestion.rating,
              tags: [...suggestion.tags, 'ai-recommended'],
              isFavorite: false,
              isWatching: false,
              score: calculateRecommendationScore({
                distance: suggestion.distance,
                rating: suggestion.rating
              })
            }));
            
            recommendations.push(...aiRecommendations);
          } catch (validationError) {
            console.warn('AI suggestions validation failed:', validationError);
          }
        }

        // Sort by weighted score for better relevance
        return recommendations
          .sort((a, b) => {
            // Primary sort by calculated score
            if (a.score && b.score && a.score !== b.score) {
              return b.score - a.score;
            }
            // Secondary sort by distance
            return a.distance - b.distance;
          })
          .slice(0, DISCOVERY_CONFIG.MAX_RESULTS);

      } catch (error) {
        console.error('Smart discovery error:', error);
        
        // Throw typed error for better error handling
        if (error instanceof DiscoveryError) {
          throw error;
        }
        
        throw new DiscoveryError(
          'Failed to fetch recommendations',
          'UNKNOWN_ERROR',
          error
        );
      }
    }
  });
};