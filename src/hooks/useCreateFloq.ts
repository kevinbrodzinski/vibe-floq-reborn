import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type VibeEnum = Database['public']['Enums']['vibe_enum'];

interface CreateFloqParams {
  location: { lat: number; lng: number };
  startsAt: Date;
  vibe: VibeEnum;
  visibility?: 'public' | 'friends' | 'invite';
  title?: string;
  invitees?: string[];
}

export function useCreateFloq() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createFloqMutation = useMutation({
    mutationFn: async (params: CreateFloqParams) => {
      const { location, startsAt, vibe, visibility = 'public', title, invitees = [] } = params;
      
      // Create PostGIS point for location
      const point = `POINT(${location.lng} ${location.lat})`;
      
      const { data, error } = await supabase.rpc('create_floq', {
        p_location: point,
        p_starts_at: startsAt.toISOString(),
        p_vibe: vibe,
        p_visibility: visibility,
        p_title: title || null,
        p_invitees: invitees,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (floqId) => {
      // Invalidate nearby floqs queries to show the new floq
      queryClient.invalidateQueries({ queryKey: ['nearby-floqs'] });
      queryClient.invalidateQueries({ queryKey: ['walkable-floqs'] });
      
      toast({
        title: "Floq created successfully!",
        description: "Your floq is now live and visible to others.",
      });
      
      return floqId;
    },
    onError: (error) => {
      console.error('Failed to create floq:', error);
      toast({
        title: "Failed to create floq",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  return {
    createFloq: createFloqMutation.mutateAsync,
    isCreating: createFloqMutation.isPending,
    error: createFloqMutation.error,
  };
}