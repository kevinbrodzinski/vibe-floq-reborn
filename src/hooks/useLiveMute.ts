/* TODO: wire to supabase.live_mute table / RPC */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';

// Stub implementation - this functionality doesn't exist in current schema
export const useLiveMute = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isMuted, setIsMuted] = useState(false);

  const { data: muteStatus } = useQuery({
    queryKey: ['live-mute', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Return mock data since the column doesn't exist
      return { live_muted_until: null };
    },
    staleTime: 30 * 1000,
  });

  const setMuteMutation = useMutation({
    mutationFn: async (minutes: number) => {
      // Mock implementation since RPC doesn't exist
      setIsMuted(minutes > 0);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-mute'] });
    },
  });

  return {
    isMuted: muteStatus?.live_muted_until ? new Date(muteStatus.live_muted_until) > new Date() : isMuted,
    setMute: setMuteMutation.mutate,
    isLoading: setMuteMutation.isPending,
  };
};