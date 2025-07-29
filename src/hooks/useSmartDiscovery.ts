import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export interface DiscoveryFilters {
  radius: number;
  vibe: string;
  activityType: string;
  timeOfDay: string;
  groupSize: number;
  budget: string;
  duration: string;
}

export interface SmartRecommendation {
  id: string;
  title: string;
  type: 'venue' | 'floq';
  distance: number;
  vibe: string;
  participants?: number;
  maxParticipants?: number;
  startTime?: string;
  endTime?: string;
  status: 'open' | 'invite_only' | 'upcoming' | 'active' | 'full' | 'private';
  price?: string;
  rating?: number;
  description?: string;
  location?: string;
  host?: {
    name: string;
    avatar?: string;
  };
  tags?: string[];
  isFavorite?: boolean;
  isWatching?: boolean;
  isRSVPd?: boolean;
  spotsLeft?: number;
  venueType?: string;
  atmosphere?: string;
  address?: string;
  categories?: string[];
  photo_url?: string;
  live_count?: number;
}

export const useSmartDiscovery = (
  userLocation: { lat: number; lng: number } | null,
  filters: DiscoveryFilters
) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['smart-discovery', userLocation, filters, user?.id],
    enabled: !!userLocation,
    staleTime: 30_000, // 30 seconds
    queryFn: async (): Promise<SmartRecommendation[]> => {
      if (!userLocation) return [];

      const recommendations: SmartRecommendation[] = [];

      try {
        // 1. Get nearby venues based on filters
        const { data: venues, error: venueError } = await supabase
          .rpc('venues_within_radius', {
            center_lat: userLocation.lat,
            center_lng: userLocation.lng,
            r_m: filters.radius * 1000
          });

        if (!venueError && venues) {
          // Filter venues based on activity type and vibe
          const filteredVenues = venues.filter((venue: any) => {
            // Filter by activity type
            if (filters.activityType === 'food') {
              return venue.categories?.some((cat: string) => 
                ['restaurant', 'cafe', 'bar', 'food'].includes(cat.toLowerCase())
              );
            }
            if (filters.activityType === 'entertainment') {
              return venue.categories?.some((cat: string) => 
                ['entertainment', 'movie_theater', 'bowling_alley', 'amusement_park'].includes(cat.toLowerCase())
              );
            }
            if (filters.activityType === 'outdoor') {
              return venue.categories?.some((cat: string) => 
                ['park', 'natural_feature', 'campground'].includes(cat.toLowerCase())
              );
            }
            if (filters.activityType === 'wellness') {
              return venue.categories?.some((cat: string) => 
                ['gym', 'spa', 'yoga_studio', 'health'].includes(cat.toLowerCase())
              );
            }
            if (filters.activityType === 'culture') {
              return venue.categories?.some((cat: string) => 
                ['museum', 'art_gallery', 'library', 'theater'].includes(cat.toLowerCase())
              );
            }
            if (filters.activityType === 'nightlife') {
              return venue.categories?.some((cat: string) => 
                ['bar', 'nightclub', 'casino'].includes(cat.toLowerCase())
              );
            }
            return true;
          });

          // Transform venues to recommendations
          const venueRecommendations: SmartRecommendation[] = filteredVenues.map((venue: any) => ({
            id: venue.id,
            title: venue.name,
            type: 'venue' as const,
            distance: venue.distance_m || 0,
            vibe: venue.vibe || filters.vibe,
            status: 'open' as const,
            description: venue.description || `${venue.categories?.join(', ') || 'Local venue'}`,
            location: venue.address || 'Nearby',
            price: getPriceForBudget(filters.budget, venue.rating),
            rating: venue.rating,
            venueType: venue.categories?.[0] || 'venue',
            tags: venue.categories || [],
            address: venue.address,
            categories: venue.categories,
            photo_url: venue.photo_url,
            live_count: venue.live_count,
            isFavorite: false,
            isWatching: false
          }));

          recommendations.push(...venueRecommendations);
        }

        // 2. Get nearby floqs based on filters (stubbed until RPC is fixed)
        const floqs: any[] = [];
        const floqError = null;

        if (!floqError && floqs) {
          // Filter floqs based on vibe and group size
          const filteredFloqs = floqs.filter((floq: any) => {
            // Filter by vibe
            if (filters.vibe && floq.primary_vibe !== filters.vibe) {
              return false;
            }
            
            // Filter by group size
            if (filters.groupSize > 1 && floq.participant_count < 2) {
              return false;
            }

            return true;
          });

          // Transform floqs to recommendations
          const floqRecommendations: SmartRecommendation[] = filteredFloqs.map((floq: any) => ({
            id: floq.id,
            title: floq.title,
            type: 'floq' as const,
            distance: floq.distance_meters || 0,
            vibe: floq.primary_vibe || filters.vibe,
            participants: floq.participant_count || 0,
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
            tags: [floq.primary_vibe, 'social', 'community'],
            isFavorite: false,
            isWatching: false,
            isRSVPd: floq.is_joined || false
          }));

          recommendations.push(...floqRecommendations);
        }

        // 3. Get AI-powered suggestions if available
        if (user) {
          try {
            const { data: aiSuggestions } = await supabase.functions.invoke('get-social-suggestions', {
              body: {
                profile_id: user.id,
                lat: userLocation.lat,
                lng: userLocation.lng,
                radius_km: filters.radius,
                vibe: filters.vibe,
                activity_type: filters.activityType,
                group_size: filters.groupSize
              }
            });

            if (aiSuggestions?.suggestions) {
              const aiRecommendations: SmartRecommendation[] = aiSuggestions.suggestions.map((suggestion: any) => ({
                id: `ai-${suggestion.id}`,
                title: suggestion.title,
                type: suggestion.type as 'venue' | 'floq',
                distance: suggestion.distance || 0,
                vibe: suggestion.vibe || filters.vibe,
                status: 'upcoming' as const,
                description: suggestion.description || 'AI-recommended based on your preferences',
                location: suggestion.location || 'Nearby',
                rating: suggestion.rating,
                tags: suggestion.tags || ['ai-recommended'],
                isFavorite: false,
                isWatching: false
              }));

              recommendations.push(...aiRecommendations);
            }
          } catch (aiError) {
            console.warn('AI suggestions not available:', aiError);
          }
        }

        // Sort by distance and relevance
        return recommendations
          .sort((a, b) => {
            // First sort by distance
            if (a.distance !== b.distance) {
              return a.distance - b.distance;
            }
            // Then by rating (for venues)
            if (a.rating && b.rating) {
              return b.rating - a.rating;
            }
            // Then by participant count (for floqs)
            if (a.participants && b.participants) {
              return b.participants - a.participants;
            }
            return 0;
          })
          .slice(0, 20); // Limit to top 20 recommendations

      } catch (error) {
        console.error('Smart discovery error:', error);
        return [];
      }
    }
  });
};

// Helper functions
function getPriceForBudget(budget: string, rating?: number): string {
  switch (budget) {
    case 'free':
      return 'Free';
    case 'budget':
      return '$';
    case 'moderate':
      return '$$';
    case 'premium':
      return '$$$';
    default:
      return rating && rating > 4 ? '$$' : '$';
  }
}

function getFloqStatus(floq: any): 'open' | 'invite_only' | 'upcoming' | 'active' | 'full' | 'private' {
  if (floq.is_private) return 'private';
  if (floq.max_participants && floq.participant_count >= floq.max_participants) return 'full';
  if (floq.starts_at && new Date(floq.starts_at) > new Date()) return 'upcoming';
  if (floq.participant_count > 0) return 'active';
  return 'open';
} 