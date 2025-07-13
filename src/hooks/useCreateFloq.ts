import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
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

  return useMutation({
    mutationFn: async (data: CreateFloqData) => {
      if (!user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase.rpc('create_floq', {
        p_location: `POINT(${data.location.lng} ${data.location.lat})`,
        p_starts_at: data.starts_at,
        p_vibe: data.primary_vibe,
        p_visibility: data.visibility,
        p_title: data.title,
        p_invitees: [] // Empty array for now
      });

      if (error) {
        console.error('Create floq error:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["my-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["floq-suggestions"] });
    },
  });
}