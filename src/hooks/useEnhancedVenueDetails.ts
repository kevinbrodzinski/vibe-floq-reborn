import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnhancedVenueDetails {
  venue_id: string;
  name: string;
  lat: number;
  lng: number;
  people_count: number;
  avg_session_minutes: number;
  dominant_vibe: string;
  vibe_diversity_score: number;
  energy_level: number;
  active_floq_count: number;
  total_floq_members: number;
  last_updated: string;
  livePresence: Array<{
    user_id: string;
    vibe: string;
    checked_in_at: string;
    session_duration: string;
    profiles: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
  }>;
  recentPosts: Array<{
    id: string;
    content_type: string;
    text_content: string;
    vibe: string;
    mood_tags: string[];
    created_at: string;
    view_count: number;
    reaction_count: number;
    profiles: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
  }>;
  socialTexture: {
    energyPulse: number;
    moodDescription: string;
    socialDynamics: {
      crowdSize: string;
      vibeStability: number;
      sessionIntensity: string;
    };
    timingInsights: {
      recommendation: string;
      trend?: string;
    };
  };
  timestamp: string;
}

export const useEnhancedVenueDetails = (venueId: string | null) => {
  return useQuery({
    queryKey: ["enhanced-venue-details", venueId],
    queryFn: async (): Promise<EnhancedVenueDetails> => {
      if (!venueId) {
        throw new Error("Venue ID is required");
      }

      console.log('useEnhancedVenueDetails calling edge function for:', venueId);

      const { data, error } = await supabase.functions.invoke(
        "get-venue-intelligence",
        {
          body: { venue_id: venueId, mode: "energy" }
        }
      );

      if (error) {
        console.error('useEnhancedVenueDetails error:', error);
        throw error;
      }

      if (!data) {
        console.error('useEnhancedVenueDetails: no data returned');
        throw new Error("No venue data found");
      }

      console.log('useEnhancedVenueDetails success:', data.name, data.people_count, 'people');
      return data;
    },
    enabled: !!venueId,
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for live data
    retry: (failureCount, error) => {
      console.log('useEnhancedVenueDetails retry attempt:', failureCount, error?.message);
      // Don't retry on 404s
      if (error?.message?.includes('not found')) return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
  });
};

export interface FloqAutoMatch {
  userVibe: string;
  potentialMatches: Array<{
    user_id: string;
    vibe: string;
    checked_in_at: string;
    session_duration: string;
    profiles: {
      username: string;
      display_name: string;
      avatar_url: string;
      bio: string;
      interests: string[];
    };
    compatibilityScore: number;
    matchReasons: string[];
  }>;
  floqSuggestions: Array<{
    type: string;
    title: string;
    description: string;
    suggestedMembers: Array<{
      profileId: string;
      username: string;
      avatar: string;
    }>;
    primaryVibe: string;
    confidence: number;
  }>;
  matchCount: number;
  timestamp: string;
}

export const useFloqAutoMatch = (profileId: string | null, venueId: string | null) => {
  return useQuery({
    queryKey: ["floq-auto-match", profileId, venueId],
    queryFn: async (): Promise<FloqAutoMatch> => {
      if (!profileId || !venueId) {
        throw new Error("User ID and Venue ID are required");
      }

      const { data, error } = await supabase.functions.invoke(
        "generate-floq-auto-match",
        {
          body: { profileId, venueId }
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!profileId && !!venueId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};