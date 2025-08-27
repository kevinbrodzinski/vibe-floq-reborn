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

export const useEnhancedVenueDetails = (venueId: string | null) =>
  useQuery<EnhancedVenueDetails>({
    queryKey: ['enhanced-venue-details', venueId],
    enabled: !!venueId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: (n, e: any) => (e?.message?.includes('not found') ? false : n < 2),
    queryFn: async (): Promise<EnhancedVenueDetails> => {
      const { data, error } = await supabase.functions.invoke('get-venue-intelligence', {
        body: { venue_id: venueId, mode: 'energy' },
      })
      if (error) throw error
      if (!data) throw new Error('No venue data found')
      return data as EnhancedVenueDetails
    },
  });

export interface FloqAutoMatch {
  userVibe: string;
  potentialMatches: Array<{
    user_id: string;
    profile_id?: string; // <- add this for UI convenience
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
    title: string;
    description: string;
    reason: string;
    primaryVibe: string;
    confidence: number;
    suggestedMembers: Array<{
      profileId: string;
      username: string;
      avatar: string;
    }>;
  }>;
  matchCount: number;
  timestamp: string;
}

export const useFloqAutoMatch = (profileId: string | null, venueId: string | null) =>
  useQuery<FloqAutoMatch>({
    queryKey: ['floq-auto-match', profileId, venueId],
    enabled: !!profileId && !!venueId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FloqAutoMatch> => {
      const { data, error } = await supabase.functions.invoke('generate-floq-auto-match', {
        body: { profileId, venueId },
      })
      if (error) throw error
      // map user_id → profile_id for UI that expects profile_id
      return {
        ...data,
        potentialMatches: (data?.potentialMatches ?? []).map((m: any) => ({ ...m, profile_id: m.user_id })),
      } as FloqAutoMatch
    },
  })