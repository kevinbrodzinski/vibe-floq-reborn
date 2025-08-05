import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useVibe } from '@/lib/store/useVibe';
import { useAuth } from '@/providers/AuthProvider';

export const usePresenceChannel = () => {
  const vibe = useCurrentVibe();
  const { location } = useUserLocation();
  const { visibility } = useVibe();
  const { user, loading: authLoading } = useAuth();

  // Memoize gh5 to ensure stable value across effects
  const gh5 = useMemo(() => location?.geohash?.slice(0, 5), [location?.geohash]);

  useEffect(() => {
    // Wait for auth to complete and ensure we have required data
    if (authLoading || !vibe || !gh5 || !user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ usePresenceChannel waiting for:', { authLoading, vibe: !!vibe, gh5: !!gh5, profileId: !!user?.id });
      }
      return;
    }

    const channelName = `vibe-${vibe}-${gh5}`;
    
    try {
      const ch = supabase.channel(channelName, { 
        config: { 
          presence: { key: channelName } 
        } 
      });

      ch
        .on('presence', { event: 'sync' }, () => {
          // Presence state is available via ch.presenceState() if needed
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Presence sync for channel:', channelName);
          }
        })
        .subscribe(async (status) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('📡 Channel status:', status, 'for:', channelName);
          }
          
          if (status === 'SUBSCRIBED') {
            try {
              await ch.track({ 
                profileId: user.id,
                name: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
                avatar: user.user_metadata?.avatar_url,
                online_at: new Date().toISOString(),
                vibe,
                gh5,
                visible: visibility !== 'off'
              });
            } catch (trackError) {
              console.warn('Failed to track presence:', trackError);
            }
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Channel connection failed:', channelName);
          }
        });

      // Clean-up on vibe / location change
      return () => {
        try {
          ch.unsubscribe().catch(console.error);
        } catch (cleanupError) {
          console.warn('Channel cleanup failed:', cleanupError);
        }
      };
    } catch (channelError) {
      console.error('Failed to create presence channel:', channelError);
    }
  }, [authLoading, vibe, gh5, user?.id]);

  // Separate effect for visibility updates
  useEffect(() => {
    if (authLoading || !vibe || !gh5 || !user?.id) return;

    const channelName = `vibe-${vibe}-${gh5}`;
    
    try {
      // Get existing channel and update visibility
      const channels = supabase.getChannels();
      const existingChannel = channels.find(ch => ch.topic === channelName);
      
      if (existingChannel && existingChannel.state === 'joined') {
        // Note: update method doesn't exist on RealtimeChannel, 
        // would need to track again with new state
        existingChannel.track({
          profileId: user.id,
          name: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
          avatar: user.user_metadata?.avatar_url,
          online_at: new Date().toISOString(),
          vibe,
          gh5,
          visible: visibility !== 'off'
        }).catch(error => {
          console.warn('Failed to update visibility:', error);
        });
      }
    } catch (error) {
      console.warn('Failed to update presence visibility:', error);
    }
  }, [authLoading, visibility, vibe, gh5, user?.id]);
};