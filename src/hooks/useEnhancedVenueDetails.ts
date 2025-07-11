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

      const { data, error } = await supabase.functions.invoke(
        "get-venue-social-energy",
        {
          body: { venueId }
        }
      );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("No venue data found");
      }

      return data;
    },
    enabled: !!venueId,
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Refetch every 30 seconds for live data
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
      userId: string;
      username: string;
      avatar: string;
    }>;
    primaryVibe: string;
    confidence: number;
  }>;
  matchCount: number;
  timestamp: string;
}

export const useFloqAutoMatch = (userId: string | null, venueId: string | null) => {
  return useQuery({
    queryKey: ["floq-auto-match", userId, venueId],
    queryFn: async (): Promise<FloqAutoMatch> => {
      if (!userId || !venueId) {
        throw new Error("User ID and Venue ID are required");
      }

      const { data, error } = await supabase.functions.invoke(
        "generate-floq-auto-match",
        {
          body: { userId, venueId }
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!userId && !!venueId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
};