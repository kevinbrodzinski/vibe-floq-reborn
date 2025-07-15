import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVibe } from '@/lib/store/useVibe';
import { useAuth } from '@/providers/AuthProvider';

export function VibeRealtime() {
  const sync = useVibe((s) => s.syncFromRemote);
  const { user } = useAuth();
  const userId = user?.id;

  // Initial fetch for brand-new installs
  useEffect(() => {
    if (!userId) return;
    
    const fetchInitialVibe = async () => {
      const { data, error } = await supabase
        .from('vibes_now')
        .select('vibe, updated_at')
        .eq('user_id', userId)
        .single();
      
      if (data && !error) {
        sync(data.vibe, data.updated_at);
      }
    };
    
    fetchInitialVibe();
  }, [userId, sync]);

  useEffect(() => {
    if (!userId) return;

    // Ensure only one channel in dev hot-reload
    const key = `vibe-now-${userId}`;
    const existing = supabase.getChannels().find((c) => c.topic === key);
    const channel =
      existing ??
      supabase
        .channel(key)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'vibes_now',
            filter: `user_id=eq.${userId}`,
          },
          (payload) =>
            sync(payload.new.vibe as string, payload.new.updated_at as string)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId, sync]);

  return null;
}