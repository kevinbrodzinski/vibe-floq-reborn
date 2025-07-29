import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLiveMute() {
  const queryClient = useQueryClient();

  // Get current mute status
  const { data: muteUntil } = useQuery({
    queryKey: ['live-mute'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from('app.profiles')
        .select('live_muted_until')
        .eq('id', user.id)
        .single();

      return data?.live_muted_until;
    }
  });

  // Set mute until timestamp
  const { mutate: setMuteUntil, isPending } = useMutation({
    mutationFn: async (until: Date) => {
      await supabase.rpc('set_live_mute_until', {
        _until: until.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-mute'] });
    }
  });

  // Convenience functions for common mute durations
  const muteFor15Min = () => {
    const until = new Date(Date.now() + 15 * 60 * 1000);
    setMuteUntil(until);
  };

  const muteFor1Hour = () => {
    const until = new Date(Date.now() + 60 * 60 * 1000);
    setMuteUntil(until);
  };

  const muteFor8Hours = () => {
    const until = new Date(Date.now() + 8 * 60 * 60 * 1000);
    setMuteUntil(until);
  };

  const isMuted = muteUntil ? new Date(muteUntil) > new Date() : false;

  return {
    muteUntil,
    isMuted,
    setMuteUntil,
    muteFor15Min,
    muteFor1Hour,
    muteFor8Hours,
    isPending
  };
} 