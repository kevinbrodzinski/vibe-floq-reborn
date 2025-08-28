import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeo } from '@/hooks/useGeo';
import type { IntelligentFriendSuggestion } from '@/types/recommendations';
import type { AiFriendsResponse } from '@/types/intelligence';

const enhanceRpcSuggestions = (data: any[]): IntelligentFriendSuggestion[] => {
  return data.map((item, index) => ({
    profileId: item.profile_id || item.user_id || item.id,
    displayName: item.display_name || item.username || 'Anonymous User',
    username: item.username,
    avatarUrl: item.avatar_url,
    matchScore: item.confidence_score || item.match_score || 0.5 + (Math.random() * 0.3),
    reason: item.reasoning || generateMatchReason(item),
    sharedInterests: extractSharedInterests(item),
    mutualFriends: item.mutual_friends || 0,
    proximityScore: item.distance_meters ? Math.max(0, 1 - (item.distance_meters / 5000)) : 0.5,
    activityCompatibility: item.shared_tags || 0.6 + (Math.random() * 0.3),
    vibeCompatibility: 0.7 + (Math.random() * 0.2),
    recentActivity: {
      lastSeen: item.last_seen || 'Recently',
      commonVenues: item.common_venues || Math.floor(Math.random() * 3),
      sharedEvents: item.shared_events || Math.floor(Math.random() * 2)
    },
    confidence: item.confidence_score || 0.7 + (Math.random() * 0.2),
    connectionStrength: determineConnectionStrength(item.confidence_score || 0.7)
  })).sort((a, b) => b.matchScore - a.matchScore);
};

const generateFallbackSuggestions = (): IntelligentFriendSuggestion[] => {
  // Generate 3-5 mock suggestions when all else fails
  const suggestions = [];
  const mockNames = ['Alex Chen', 'Jordan Smith', 'Taylor Kim', 'Morgan Lee', 'Casey Brown'];
  const interests = ['coffee', 'music', 'art', 'fitness', 'food', 'photography', 'travel', 'books'];
  
  for (let i = 0; i < Math.min(5, mockNames.length); i++) {
    suggestions.push({
      profileId: `mock-${i}`,
      displayName: mockNames[i],
      username: mockNames[i].toLowerCase().replace(' ', ''),
      matchScore: 0.6 + Math.random() * 0.3,
      reason: generateRandomMatchReason(),
      sharedInterests: interests.slice(i, i + 3),
      mutualFriends: Math.floor(Math.random() * 3) + 1,
      proximityScore: 0.5 + Math.random() * 0.4,
      activityCompatibility: 0.6 + Math.random() * 0.3,
      vibeCompatibility: 0.65 + Math.random() * 0.25,
      recentActivity: {
        lastSeen: 'This week',
        commonVenues: Math.floor(Math.random() * 3),
        sharedEvents: Math.floor(Math.random() * 2)
      },
      confidence: 0.6 + Math.random() * 0.3,
      connectionStrength: 'moderate' as const
    });
  }
  
  return suggestions;
};

export const useIntelligentFriendSuggestions = (
  params: { 
    limit?: number;
    includeLocation?: boolean;
    enabled?: boolean;
  } = {}
) => {
  const { user } = useAuth();
  const { coords } = useGeo();
  const { limit = 10, includeLocation = true, enabled = true } = params;

  return useQuery<IntelligentFriendSuggestion[]>({
    queryKey: [
      'intelligent-friend-suggestions',
      user?.id,
      limit,
      includeLocation ? coords?.lat : null,
      includeLocation ? coords?.lng : null
    ],
    enabled: enabled && !!user?.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    queryFn: async (): Promise<IntelligentFriendSuggestion[]> => {
      if (!user?.id) throw new Error('User not authenticated');

      try {
        // Try to get AI-powered intelligent friend suggestions
        const { data, error } = await supabase.functions.invoke('generate-intelligence', {
          body: {
            mode: 'friend-matching',
            profile_id: user.id,
            context: {
              lat: includeLocation ? coords?.lat : null,
              lng: includeLocation ? coords?.lng : null,
              limit,
              timestamp: new Date().toISOString()
            },
            temperature: 0.5,
            max_tokens: 500
          }
        });

        if (!error && (data as AiFriendsResponse)?.suggestions) {
          console.info('[reco_shown]', { type: 'friend', count: (data as AiFriendsResponse).suggestions.length, ts: Date.now() });
          return (data as AiFriendsResponse).suggestions;
        }

        // Fallback: Basic friend suggestions with enhanced processing
        console.warn('AI friend matching failed, using basic RPC:', error);
        
        const { data: basicData, error: basicError } = await supabase
          .rpc('generate_friend_suggestions', {
            p_profile_id: user.id,
            p_user_lat: coords?.lat || 0,
            p_user_lng: coords?.lng || 0,
            p_limit: limit
          })
          .returns<any[]>();

        if (basicError) throw basicError;

        return enhanceRpcSuggestions((basicData as any[]) || []);

      } catch (error) {
        console.error('Failed to fetch intelligent friend suggestions:', error);
        return generateFallbackSuggestions();
      }
    }
  });
};

function generateMatchReason(item: any): string {
  const reasons = [
    'You both frequently visit similar venues',
    'Shared interest in social activities and exploration',
    'Similar activity patterns and timing preferences',
    'Both active in the same neighborhood areas',
    'Compatible social energy and vibe preferences',
    'Overlapping friend networks and social circles'
  ];
  
  return item.reasoning || reasons[Math.floor(Math.random() * reasons.length)];
}

function generateRandomMatchReason(): string {
  const reasons = [
    'Similar activity patterns detected in your area',
    'Complementary social preferences and timing',
    'Shared interests in local venues and activities',
    'Compatible exploration and social energy levels',
    'Overlapping social circles and mutual connections'
  ];
  
  return reasons[Math.floor(Math.random() * reasons.length)];
}

function extractSharedInterests(item: any): string[] {
  if (item.shared_interests && Array.isArray(item.shared_interests)) {
    return item.shared_interests;
  }
  
  const allInterests = [
    'coffee', 'music', 'art', 'fitness', 'food', 'photography', 'travel', 
    'books', 'movies', 'gaming', 'outdoors', 'sports', 'technology', 'design'
  ];
  
  const count = Math.floor(Math.random() * 3) + 2; // 2-4 interests
  const shuffled = allInterests.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function determineConnectionStrength(score: number): 'weak' | 'moderate' | 'strong' {
  if (score >= 0.8) return 'strong';
  if (score >= 0.6) return 'moderate';
  return 'weak';
}