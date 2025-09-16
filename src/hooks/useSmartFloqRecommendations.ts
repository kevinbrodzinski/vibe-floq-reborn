import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useVibeMatchingEngine } from './useVibeMatchingEngine';
import { useSocialGraphIntegration } from './useSocialGraphIntegration';
import { useAuth } from '@/hooks/useAuth';
import { useGeo } from '@/hooks/useGeo';
import { supabase } from '@/integrations/supabase/client';
import type { HubItem } from './useFloqsHubData';

interface UserBehaviorProfile {
  preferred_times: number[]; // Hours of day when most active
  typical_session_duration: number; // Minutes
  favorite_vibes: string[];
  energy_patterns: Array<{ hour: number; energy: number }>;
  social_preferences: {
    group_size_preference: 'small' | 'medium' | 'large' | 'any';
    familiarity_preference: 'friends_only' | 'mixed' | 'new_people';
    commitment_speed: 'instant' | 'quick' | 'deliberate';
  };
  location_patterns: Array<{
    lat: number;
    lng: number;
    frequency: number;
    time_of_day: number[];
  }>;
}

interface RecommendationScore {
  total_score: number;
  breakdown: {
    vibe_compatibility: number;
    social_proof: number;
    temporal_relevance: number;
    location_convenience: number;
    behavioral_match: number;
    serendipity_factor: number;
  };
  confidence: number;
  explanation: string;
}

interface SmartRecommendation extends HubItem {
  recommendation_score: RecommendationScore;
  predicted_satisfaction: number;
  optimal_join_time?: string;
  personalized_highlights: string[];
  social_context?: any;
}

export function useSmartFloqRecommendations(limit = 12) {
  const { user } = useAuth();
  const { coords } = useGeo();
  const vibeEngine = useVibeMatchingEngine();
  const socialGraph = useSocialGraphIntegration();

  // Fetch user behavior profile
  const { data: userProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ['user-behavior-profile', user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async (): Promise<UserBehaviorProfile | null> => {
      if (!user?.id) return null;

      try {
        // Get current user vibe preferences from vibes_now table
        const { data: vibeHistory } = await supabase
          .from('vibes_now')
          .select('vibe, updated_at')
          .eq('profile_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(50);

        // Analyze vibe patterns
        const vibeFrequency = (vibeHistory || []).reduce((acc, record) => {
          const vibe = record.vibe || 'social';
          acc[vibe] = (acc[vibe] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const favoriteVibes = Object.entries(vibeFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([vibe]) => vibe);

        // Generate intelligent defaults based on time patterns
        const currentHour = new Date().getHours();
        const preferredTimes = currentHour >= 17 && currentHour <= 22 
          ? [17, 18, 19, 20, 21, 22] 
          : [12, 13, 18, 19, 20];

        return {
          preferred_times: preferredTimes,
          typical_session_duration: 120,
          favorite_vibes: favoriteVibes.length > 0 ? favoriteVibes : ['social', 'chill'],
          energy_patterns: [],
          social_preferences: {
            group_size_preference: 'medium',
            familiarity_preference: 'mixed',
            commitment_speed: 'quick'
          },
          location_patterns: []
        };
      } catch (error) {
        console.error('Failed to fetch user behavior profile:', error);
        return {
          preferred_times: [18, 19, 20, 21],
          typical_session_duration: 120,
          favorite_vibes: ['social', 'chill'],
          energy_patterns: [],
          social_preferences: {
            group_size_preference: 'medium',
            familiarity_preference: 'mixed',
            commitment_speed: 'quick'
          },
          location_patterns: []
        };
      }
    }
  });

  // Fetch candidate floqs for recommendation using existing floqs table
  const { data: candidateFloqs, isLoading: loadingCandidates } = useQuery({
    queryKey: ['recommendation-candidates', coords?.lat, coords?.lng],
    enabled: !!coords?.lat && !!coords?.lng,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async (): Promise<HubItem[]> => {
      if (!coords?.lat || !coords?.lng) return [];

      try {
        // Get nearby floqs using existing table structure
        const { data: floqs, error } = await supabase
          .from('floqs')
          .select(`
            id,
            title,
            primary_vibe,
            created_at
          `)
          .limit(50);

        if (error) {
          console.error('Failed to fetch floqs:', error);
          return [];
        }

        // Transform to HubItem format with mock data
        return (floqs || []).map(floq => ({
          id: floq.id,
          name: floq.title,
          title: floq.title,
          status: "live" as const,
          type: "public" as const,
          privacy: "public" as const,
          visibility: "public" as const,
          starts_at: new Date(Date.now() + Math.random() * 3600000).toISOString(),
          ends_at: new Date(Date.now() + Math.random() * 7200000 + 3600000).toISOString(),
          vibe: floq.primary_vibe,
          primary_vibe: floq.primary_vibe,
          created_at: floq.created_at,
          creator_id: 'mock-creator',
          participants: Math.floor(Math.random() * 20) + 1,
          friends_in: Math.floor(Math.random() * 3),
          recsys_score: Math.random() * 0.5 + 0.5,
          distance_meters: Math.floor(Math.random() * 5000) + 100
        }));
      } catch (error) {
        console.error('Failed to fetch recommendation candidates:', error);
        return [];
      }
    }
  });

  // Generate smart recommendations
  const recommendations = useMemo(() => {
    if (!userProfile || !candidateFloqs || !coords) return [];

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    return candidateFloqs
      .map((floq): SmartRecommendation => {
        let totalScore = 0;
        const breakdown = {
          vibe_compatibility: 0,
          social_proof: 0,
          temporal_relevance: 0,
          location_convenience: 0,
          behavioral_match: 0,
          serendipity_factor: 0
        };

        // 1. Vibe compatibility (25% weight)
        const primaryVibeMatch = userProfile.favorite_vibes.includes(
          floq.primary_vibe || floq.vibe || 'social'
        ) ? 1 : 0.5;
        breakdown.vibe_compatibility = primaryVibeMatch;
        totalScore += primaryVibeMatch * 0.25;

        // 2. Temporal relevance (20% weight)
        let timeScore = 0;
        const floqHour = floq.starts_at ? new Date(floq.starts_at).getHours() : currentHour;
        const timePreference = userProfile.preferred_times.includes(floqHour) ? 1 : 0.3;
        
        // Urgency factor (starting soon = higher score)
        if (floq.starts_at) {
          const minutesUntilStart = (new Date(floq.starts_at).getTime() - Date.now()) / (1000 * 60);
          if (minutesUntilStart > 0 && minutesUntilStart <= 60) {
            timeScore = 1; // Perfect timing
          } else if (minutesUntilStart <= 180) {
            timeScore = 0.8; // Soon
          } else {
            timeScore = timePreference;
          }
        } else {
          timeScore = timePreference;
        }
        breakdown.temporal_relevance = timeScore;
        totalScore += timeScore * 0.20;

        // 3. Location convenience (20% weight)
        let locationScore = 0.5;
        if (floq.distance_meters) {
          // Score based on distance (closer = better)
          const distanceKm = floq.distance_meters / 1000;
          locationScore = Math.max(0.1, Math.min(1, Math.exp(-distanceKm / 3))); // Exponential decay
        }
        
        // Boost for familiar locations
        const isFamiliarLocation = userProfile.location_patterns.some(pattern => {
          const distance = Math.sqrt(
            Math.pow(pattern.lat - (coords.lat || 0), 2) +
            Math.pow(pattern.lng - (coords.lng || 0), 2)
          );
          return distance < 0.01; // ~1km
        });
        
        if (isFamiliarLocation) locationScore = Math.min(1, locationScore + 0.2);
        breakdown.location_convenience = locationScore;
        totalScore += locationScore * 0.20;

        // 4. Behavioral match (15% weight)
        let behaviorScore = 0.5;
        
        // Group size preference
        const participantCount = floq.participants || floq.participant_count || 0;
        const groupSizeMatch = (() => {
          switch (userProfile.social_preferences.group_size_preference) {
            case 'small': return participantCount <= 5 ? 1 : 0.3;
            case 'medium': return participantCount >= 4 && participantCount <= 12 ? 1 : 0.5;
            case 'large': return participantCount > 10 ? 1 : 0.4;
            case 'any': return 0.8;
            default: return 0.5;
          }
        })();
        
        behaviorScore = groupSizeMatch;
        breakdown.behavioral_match = behaviorScore;
        totalScore += behaviorScore * 0.15;

        // 5. Social proof will be calculated separately
        breakdown.social_proof = 0.5; // Placeholder
        totalScore += 0.5 * 0.15;

        // 6. Serendipity factor (5% weight) - some randomness for discovery
        const serendipityScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
        breakdown.serendipity_factor = serendipityScore;
        totalScore += serendipityScore * 0.05;

        // Calculate confidence based on data completeness
        const dataCompleteness = [
          floq.primary_vibe || floq.vibe ? 1 : 0,
          floq.starts_at ? 1 : 0,
          floq.distance_meters ? 1 : 0,
          (floq.participants || floq.participant_count) ? 1 : 0
        ].reduce((a, b) => a + b, 0) / 4;

        const confidence = Math.min(1, dataCompleteness * 0.8 + 0.2);

        // Generate explanation
        const highlights = [];
        if (breakdown.vibe_compatibility > 0.8) {
          highlights.push(`Perfect vibe match for ${floq.primary_vibe || floq.vibe}`);
        }
        if (breakdown.temporal_relevance > 0.8) {
          highlights.push("Great timing for you");
        }
        if (breakdown.location_convenience > 0.8) {
          highlights.push("Conveniently located");
        }
        if (behaviorScore > 0.8) {
          highlights.push("Matches your group size preference");
        }

        const explanation = highlights.length > 0 
          ? highlights.join(" • ")
          : "Recommended based on your preferences";

        return {
          ...floq,
          recommendation_score: {
            total_score: Math.min(1, totalScore),
            breakdown,
            confidence,
            explanation
          },
          predicted_satisfaction: Math.min(1, totalScore * confidence),
          personalized_highlights: highlights
        };
      })
      .sort((a, b) => b.recommendation_score.total_score - a.recommendation_score.total_score)
      .slice(0, limit);
  }, [userProfile, candidateFloqs, coords, limit]);

  // Add social context to top recommendations
  const enrichedRecommendations = useMemo(async () => {
    if (!recommendations.length || socialGraph.loadingSocialGraph) return recommendations;

    // Add social context to top 6 recommendations for performance
    const topRecommendations = recommendations.slice(0, 6);
    const socialContexts = await socialGraph.batchGetSocialContext(
      topRecommendations.map(r => r.id)
    );

    return recommendations.map(rec => {
      const socialContext = socialContexts?.[rec.id];
      if (socialContext) {
        // Update social proof score
        const socialBoost = socialGraph.getSocialRecommendationBoost(socialContext);
        const updatedScore = {
          ...rec.recommendation_score,
          breakdown: {
            ...rec.recommendation_score.breakdown,
            social_proof: socialContext.social_proof.trust_score
          },
          total_score: Math.min(1, rec.recommendation_score.total_score + socialBoost)
        };

        return {
          ...rec,
          recommendation_score: updatedScore,
          social_context: socialContext,
          personalized_highlights: [
            ...rec.personalized_highlights,
            ...(socialContext.social_proof.mutual_friends_count > 0 
              ? [`${socialContext.social_proof.mutual_friends_count} mutual friends`]
              : [])
          ]
        };
      }
      return rec;
    });
  }, [recommendations, socialGraph]);

  return {
    recommendations: recommendations,
    isLoading: loadingProfile || loadingCandidates,
    userProfile,
    
    // Utility functions
    getRecommendationExplanation: (floq: SmartRecommendation) => floq.recommendation_score.explanation,
    getConfidenceLevel: (score: number) => 
      score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
    
    // Refresh recommendations
    refreshRecommendations: () => {
      // This would trigger a refetch of the queries
      // Implementation depends on your query client setup
    }
  };
}