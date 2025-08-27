import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface FloqSuggestion {
  floq_id: string;
  title: string;
  primary_vibe: string;
  distance_meters: number;
  participant_count: number;
  confidence_score: number;
  reasoning: any; // Flexible type to handle Json variations
}

interface UseFloqSuggestionsOptions {
  geo?: { lat: number; lng: number };
  limit?: number;
  enabled?: boolean;
}

export function useFloqSuggestions({ 
  geo, 
  limit = 10, 
  enabled = true 
}: UseFloqSuggestionsOptions = {}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["floq-suggestions", user?.id, geo?.lat, geo?.lng, limit],
    enabled: enabled && !!user && !!geo,
    queryFn: async () => {
      if (!user || !geo) return [];
      
      const { data, error } = await supabase.rpc("generate_floq_suggestions", {
        p_profile_id: user.id,
        p_user_lat: geo.lat,
        p_user_lng: geo.lng,
        p_limit: limit,
      } as any).returns<FloqSuggestion[]>();

      if (error) {
        console.error("Floq suggestions error:", error);
        throw error;
      }

      return (data || []) as FloqSuggestion[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
}