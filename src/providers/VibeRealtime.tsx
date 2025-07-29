import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVibe } from '@/lib/store/useVibe';
import { useAuth } from '@/providers/AuthProvider';

export function VibeRealtime() {
  const sync = useVibe((s) => s.syncFromRemote);
  const { user, loading: authLoading } = useAuth();
  const profileId = user?.id;

  // Initial fetch for brand-new installs
  useEffect(() => {
    if (authLoading || !profileId) return;
    
    const fetchInitialVibe = async () => {
      try {
        const { data, error } = await supabase
          .from('vibes_now')
          .select('vibe, updated_at')
          .eq('profile_id', profileId)
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
  }, [authLoading, profileId, sync]);

  // Realtime subscription management
  useEffect(() => {
    if (authLoading || !profileId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ VibeRealtime waiting for auth:', { authLoading, profileId: !!profileId });
      }
      return;
    }

    // Ensure only one channel in dev hot-reload
    const key = `vibe-now-${profileId}`;
    const existing = supabase.getChannels().find((c) => c.topic === key);
    
    try {
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
              filter: `profile_id=eq.${profileId}`,
            },
            (payload) => {
              try {
                sync(payload.new.vibe as string, payload.new.updated_at as string);
              } catch (syncError) {
                console.warn('Failed to sync vibe update:', syncError);
              }
            }
          )
          .subscribe((status) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('📡 Vibe channel status:', status, 'for user:', profileId);
            }
            if (status === 'CHANNEL_ERROR') {
              console.warn('Vibe channel connection failed for user:', profileId);
            }
          });

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (cleanupError) {
          console.warn('Failed to cleanup vibe channel:', cleanupError);
        }
      };
    } catch (channelError) {
      console.error('Failed to create vibe channel:', channelError);
    }
  }, [authLoading, profileId, sync]);

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