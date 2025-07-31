import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from 'use-debounce';
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
  
  // Debounce filters to prevent excessive requests (250ms debounce)
  const [debouncedFilters] = useDebounce(filters, 250);

  // Stabilize query key to prevent cache thrashing
  const queryKey = useMemo(() => 
    createDiscoveryQueryKey(userLocation, debouncedFilters, user?.id),
    [userLocation?.lat, userLocation?.lng, debouncedFilters.radius, debouncedFilters.vibe, debouncedFilters.activityType, debouncedFilters.groupSize, debouncedFilters.budget, user?.id]
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
          // 1. Get personalized nearby venues
          Promise.race([
            supabase.rpc('venues_within_radius', {
              p_lat: userLocation.lat,
              p_lng: userLocation.lng,
              p_radius_m: debouncedFilters.radius,
              p_limit: DISCOVERY_CONFIG.DEFAULT_LIMIT,
              p_profile_id: user?.id || null,
              p_categories: debouncedFilters.activityType !== 'all' ? [debouncedFilters.activityType] : null,
              p_price_tier_max: debouncedFilters.budget === 'free' ? '$' : 
                                debouncedFilters.budget === 'budget' ? '$$' :
                                debouncedFilters.budget === 'moderate' ? '$$$' : '$$$$',
              p_vibe: debouncedFilters.vibe !== 'all' ? debouncedFilters.vibe : null
            }),
            timeoutPromise
          ]),
          
          // 2. Get nearby floqs using the new RPC
          Promise.race([
            supabase.rpc('get_nearby_floqs', {
              p_lat: userLocation.lat,
              p_lng: userLocation.lng,
              p_radius_m: debouncedFilters.radius,
              p_primary_vibe: debouncedFilters.vibe === 'all' ? null : debouncedFilters.vibe as any,
              p_limit: DISCOVERY_CONFIG.DEFAULT_LIMIT
            }),
            timeoutPromise
          ]),
          
          // 3. Get AI suggestions  
          user ? Promise.race([
            supabase.functions.invoke('get-social-suggestions', {
              body: {
                lat: userLocation.lat,
                lng: userLocation.lng,
                radiusKm: debouncedFilters.radius / 1000, // Convert meters to kilometers
                limit: DISCOVERY_CONFIG.DEFAULT_LIMIT
              }
            }),
            timeoutPromise
          ]) : Promise.resolve({ data: null, error: null })
        ]);

        // Process venues (now personalized)
        if (venuesResult.status === 'fulfilled' && venuesResult.value && typeof venuesResult.value === 'object' && 'data' in venuesResult.value && venuesResult.value.data) {
          try {
            // The new RPC returns personalized venues that are already filtered
            const venueRecommendations: SmartRecommendation[] = (venuesResult.value.data as any[]).map((venue: any) => {
              const recommendation = {
                id: venue.venue_id,
                title: venue.name,
                type: 'venue' as const,
                distance: venue.distance_m,
                vibe: debouncedFilters.vibe,
                status: 'open' as const,
                description: venue.description || `${venue.categories?.join(', ') || 'Local venue'}`,
                location: venue.address || 'Nearby',
                price: venue.price_tier || '$',
                rating: venue.rating,
                venueType: venue.categories?.[0] || 'venue',
                tags: venue.categories || [],
                address: venue.address,
                categories: venue.categories || [],
                photo_url: venue.photo_url,
                live_count: venue.live_count || 0,
                isFavorite: false,
                isWatching: false,
                score: venue.personalized_score || 0.5 // Use personalized score from RPC
              };
              
              return recommendation;
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
              if (debouncedFilters.vibe !== 'all' && floq.primary_vibe !== debouncedFilters.vibe) return false;
              if (debouncedFilters.groupSize > 1 && floq.participant_count < 2) return false;
              return true;
            });
            
            const floqRecommendations: SmartRecommendation[] = filteredFloqs.map(floq => {
              const recommendation = {
                id: floq.id,
                title: floq.title,
                type: 'floq' as const,
                distance: floq.distance_m,
                vibe: floq.primary_vibe || debouncedFilters.vibe,
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
              
            const validatedSuggestions = aiData.map((suggestion: any, index: number) => {
              // Provide defaults for required fields if missing
              const processedSuggestion = {
                id: suggestion.id || suggestion.venue_id || suggestion.floq_id || `ai-suggestion-${index}`,
                title: suggestion.title || suggestion.name || 'AI Suggestion',
                type: suggestion.type || 'venue',
                distance: suggestion.distance || suggestion.distance_m || 0,
                vibe: suggestion.vibe || suggestion.primary_vibe || undefined,
                description: suggestion.description || undefined,
                location: suggestion.location || suggestion.address || undefined,
                rating: suggestion.rating || undefined,
                tags: suggestion.tags || suggestion.categories || []
              };
              return AiSuggestionSchema.parse(processedSuggestion);
            }).filter(Boolean);
            
            const aiRecommendations: SmartRecommendation[] = validatedSuggestions.map(suggestion => ({
              id: `ai-${suggestion.id}`,
              title: suggestion.title,
              type: suggestion.type,
              distance: suggestion.distance,
              vibe: suggestion.vibe || debouncedFilters.vibe,
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