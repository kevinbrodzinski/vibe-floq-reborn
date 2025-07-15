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
      try {
        const { data, error } = await supabase
          .from('vibes_now')
          .select('vibe, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (data && !error) {
          sync(data.vibe, data.updated_at);
        } else if (data === null && !error) {
          // Row doesn't exist yet - user hasn't set vibe
          if (process.env.NODE_ENV === 'development') {
            console.log('[VibeRealtime] No vibe row found for user - fresh start');
          }
        }
      } catch (err) {
        // Silently ignore - user hasn't set a vibe yet
        if (process.env.NODE_ENV === 'development') {
          console.log('[VibeRealtime] Initial fetch failed:', err);
        }
      }
    };
    
    fetchInitialVibe();
  }, [userId, sync]);

  // Realtime subscription management
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

  // Clean up channels and store on auth state change
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Remove all vibe channels
        supabase.getChannels().forEach(channel => {
          if (channel.topic.startsWith('vibe-now-')) {
            supabase.removeChannel(channel);
          }
        });
        
        // Clear persisted store and reset state for fresh start
        useVibe.persist.clearStorage();
        useVibe.setState({ vibe: null, updatedAt: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}