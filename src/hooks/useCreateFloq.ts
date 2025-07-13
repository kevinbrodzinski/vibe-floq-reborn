import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
import { supabase } from "@/integrations/supabase/client";
import type { Vibe } from "@/types";

interface CreateFloqData {
  title: string;
  description?: string;
  primary_vibe: Vibe;
  location: { lat: number; lng: number };
  starts_at: string;
  ends_at: string;
  max_participants: number;
  visibility: 'public' | 'private';
}

export function useCreateFloq() {
  const session = useSession();
  const user = session?.user;
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
      queryClient.invalidateQueries({ queryKey: ["my-flocks"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-flocks"] });
      queryClient.invalidateQueries({ queryKey: ["floq-suggestions"] });
    },
  });
}