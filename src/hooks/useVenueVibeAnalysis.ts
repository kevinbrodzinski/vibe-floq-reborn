import { useQuery } from "@tanstack/react-query";
import { EnhancedVenueIntelligence } from "@/core/vibe/collectors/EnhancedVenueIntelligence";
import type { VenueIntelligence } from "@/types/venues";
import { useMemo } from "react";

interface VenueVibeAnalysisProps {
  lat: number;
  lng: number;
  enabled?: boolean;
}

/**
 * Hook to get comprehensive venue-vibe analysis for a location
 */
export const useVenueVibeAnalysis = ({ lat, lng, enabled = true }: VenueVibeAnalysisProps) => {
  const enhancedVenueIntelligence = useMemo(() => new EnhancedVenueIntelligence(), []);

  return useQuery({
    queryKey: ["venue-vibe-analysis", lat, lng],
    enabled: enabled && Number.isFinite(lat) && Number.isFinite(lng),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
    queryFn: async (): Promise<VenueIntelligence | null> => {
      return enhancedVenueIntelligence.getVenueIntelligence({ lat, lng });
    },
    retry: (failureCount, error) => {
      // Don't retry network errors too aggressively
      if (error instanceof Error && error.message.includes('network')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};

/**
 * Hook to get venue recommendations based on current vibe
 */
export const useVenueVibeRecommendations = (
  currentVibe: string,
  location: { lat: number; lng: number } | null,
  radius = 1000
) => {
  return useQuery({
    queryKey: ["venue-vibe-recommendations", currentVibe, location?.lat, location?.lng, radius],
    enabled: !!location && !!currentVibe,
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      if (!location) return [];

      // This would typically call an enhanced venues endpoint that filters by vibe compatibility
      // For now, we'll use the existing nearby venues and filter client-side
      const { useNearbyVenues } = await import('./useNearbyVenues');
      
      // Get nearby venues
      const venues = await fetch(`/api/venues/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`);
      
      // In a real implementation, this would:
      // 1. Get all nearby venues
      // 2. Analyze each venue's vibe profile
      // 3. Rank by compatibility with current vibe
      // 4. Return sorted recommendations
      
      return [];
    }
  });
};