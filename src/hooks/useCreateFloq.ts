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

      // Try the new lat/lng format first
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
      
      console.log('🔍 create_floq RPC params (lat/lng):', rpcParams);

      let result, error;
      
      // Try new signature first
      ({ data: result, error } = await supabase.rpc('create_floq', rpcParams));
      
      // If that fails, try old signature as fallback
      if (error && error.code === 'PGRST202') {
        console.log('🔄 Trying fallback with geography format...');
        const fallbackParams = {
          p_location: `POINT(${data.location.lng} ${data.location.lat})`,
          p_starts_at: data.starts_at,
          p_vibe: data.primary_vibe,
          p_visibility: data.visibility,
          p_title: data.title,
          p_invitees: [],
          p_ends_at: data.ends_at,
          p_flock_type: data.flock_type
        };
        console.log('🔍 create_floq RPC params (geography):', fallbackParams);
        ({ data: result, error } = await supabase.rpc('create_floq', fallbackParams));
      }

      if (error) {
        console.error('Create floq error:', error);
        console.error('Attempted parameters:', rpcParams);
        throw error;
      }

      return result;
    },
    onSuccess: (newFloqId, vars) => {
      // 1. Seed the cache so the first paint shows joined state
      queryClient.setQueryData(
        ['floq-details', newFloqId, user?.id],
        () => ({
          id: newFloqId,
          title: vars.title || 'Untitled',
          description: vars.description,
          primary_vibe: vars.primary_vibe,
          creator_id: user?.id,
          is_creator: true,
          is_joined: true,
          can_manage: true,
          participant_count: 1,
          participants: [
            {
              user_id: user?.id,
              role: 'creator',
              joined_at: new Date().toISOString(),
              user: {
                id: user?.id,
                username: user?.user_metadata?.username,
                display_name: user?.user_metadata?.display_name,
                avatar_url: user?.user_metadata?.avatar_url,
              },
            },
          ],
          location: vars.location,
          starts_at: vars.starts_at,
          ends_at: vars.ends_at,
          visibility: vars.visibility,
          flock_type: vars.flock_type,
          max_participants: vars.max_participants,
        })
      );

      // 2. Force a refetch to get fresh data from DB
      queryClient.invalidateQueries({
        queryKey: ['floq-details', newFloqId, user?.id],
        exact: true,
      });

      // 3. Invalidate list caches
      queryClient.invalidateQueries({ queryKey: ["my-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["active-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["floq-suggestions"] });

      // Show success toast
      toast({
        title: "Floq created!",
        description: "Your floq has been created successfully.",
      });

      // 4. Slight delay before navigation to ensure cache is seeded
      setTimeout(() => navigate(`/floqs/${newFloqId}`), 50);
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