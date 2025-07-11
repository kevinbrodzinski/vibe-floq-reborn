import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueEnergyMetrics {
  venue_id: string;
  energy_level: number;
  vibe_diversity_score: number;
  dominant_vibe: string;
  people_count: number;
  avg_session_minutes: number;
  active_floq_count: number;
  total_floq_members: number;
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
}

export const useVenueEnergy = (venueId: string | null) => {
  return useQuery({
    queryKey: ["venue-energy", venueId],
    queryFn: async (): Promise<VenueEnergyMetrics> => {
      if (!venueId) {
        throw new Error("Venue ID is required");
      }

      const { data, error } = await supabase.functions.invoke(
        "get-venue-energy-metrics",
        {
          body: { venueId }
        }
      );

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!venueId,
    staleTime: 15000,
    refetchInterval: 30000,
  });
};