import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Vibe } from "@/types";

export type FlockType = 'momentary' | 'persistent' | 'recurring' | 'template';

export interface CreateFloqParams {
  title: string;
  description?: string;
  primary_vibe: Vibe;
  location: { lat: number; lng: number };
  starts_at: string;
  ends_at?: string | null;
  visibility: 'public' | 'private';
  flock_type: FlockType;
  invitees?: string[];
  max_participants?: number;
}

export function useCreateFloq() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    retry: 1, // Bail quickly on 409 duplicate key errors
    mutationFn: async (params: CreateFloqParams) => {
      if (!user) throw new Error('Not authenticated');

      const {
        location, title, primary_vibe, visibility,
        starts_at, ends_at = null,
        flock_type, invitees = [], max_participants, description,
      } = params;

      const rpcParams = {
        p_lat: location.lat,
        p_lng: location.lng,
        p_starts_at: starts_at,
        p_ends_at: ends_at,
        p_vibe: primary_vibe,
        p_visibility: visibility,
        p_title: title,
        p_invitees: invitees,
        p_flock_type: flock_type,
      };
      
      console.log('🔍 create_floq RPC params:', rpcParams);

      const { data: result, error } = await supabase.rpc('create_floq', rpcParams);

      if (error) {
        console.error('Create floq error:', error);
        console.error('Attempted parameters:', rpcParams);
        throw error;
      }

      return result as string; // floq_id
    },
    onSuccess: (newFloqId, vars) => {
      // Seed the cache so the first paint is correct
      queryClient.setQueryData(
        ['floq-details', newFloqId, user?.id],
        () => ({
          id: newFloqId,
          creator_id: user?.id,
          is_creator: true,
          is_joined: true,
          participant_count: 1,
          participants: [
            {
              profile_id: user?.id,
              role: 'creator',
              joined_at: new Date().toISOString(),
            },
          ],
          title: vars.title || 'Untitled',
          primary_vibe: vars.primary_vibe,
          location: vars.location,
          starts_at: vars.starts_at,
          ends_at: vars.ends_at,
          visibility: vars.visibility,
          flock_type: vars.flock_type,
          max_participants: vars.max_participants,
        })
      );

      // Force a refetch so you get the fresh row from DB
      queryClient.invalidateQueries({
        queryKey: ['floq-details', newFloqId, user?.id],
        exact: true,
      });

      // Invalidate list caches
      queryClient.invalidateQueries({ queryKey: ["my-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["active-floqs"] });
      queryClient.invalidateQueries({ queryKey: ["floq-suggestions"] });

      // Show success toast
      toast({
        title: "Floq created!",
        description: "Your floq has been created successfully.",
      });

      // Slight delay before navigation
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