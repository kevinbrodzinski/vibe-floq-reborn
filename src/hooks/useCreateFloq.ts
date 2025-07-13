import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Vibe } from "@/types";

interface CreateFloqData {
  title: string;
  description?: string;
  primary_vibe: Vibe;
  location: { lat: number; lng: number };
  starts_at: string;
  ends_at?: string | null; // Optional - null for persistent floqs
  flock_type?: 'momentary' | 'persistent'; // Optional - defaults to momentary
  max_participants: number;
  visibility: 'public' | 'private';
}

export function useCreateFloq() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateFloqData) => {
      if (!user) throw new Error('Not authenticated');

      // Debug: Log the exact parameters being sent
      const rpcParams = {
        p_lat: data.location.lat,
        p_lng: data.location.lng,
        p_starts_at: data.starts_at,
        p_vibe: data.primary_vibe,
        p_visibility: data.visibility,
        p_title: data.title,
        p_invitees: [],
        p_ends_at: data.ends_at,
        p_flock_type: data.flock_type
      };
      
      console.log('🔍 create_floq RPC params:', rpcParams);

      // Updated to use lat/lng parameters instead of location object
      const { data: result, error } = await supabase.rpc('create_floq', rpcParams);

      if (error) {
        console.error('Create floq error:', error);
        console.error('Attempted parameters:', rpcParams);
        throw error;
      }

      return result;
    },
    onSuccess: (floqId) => {
      // Show success toast
      toast({
        title: "Floq created!",
        description: "Your floq has been created successfully.",
      });

      // Navigate to the new floq
      navigate(`/floqs/${floqId}`);

      // Invalidate all relevant queries with consistent cache keys
      queryClient.invalidateQueries({ queryKey: ["my-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["active-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["floq-suggestions"] });
    },
    onError: (error) => {
      console.error('Create floq failed:', error);
      toast({
        variant: "destructive",
        title: "Failed to create floq",
        description: error.message || "Something went wrong. Please try again.",
      });
    },
  });
}