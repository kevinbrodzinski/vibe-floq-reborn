import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useVibe } from '@/lib/store/useVibe';
import { useAuth } from '@/hooks/useAuth';
import { encodeGeohash } from '@/lib/geohash';

export const usePresenceChannel = () => {
  const vibe = useCurrentVibe(); // string-like vibe token
  const { visibility } = useVibe(); // 'on' | 'friends' | 'off' etc.
  const { user, loading: authLoading } = useAuth();

  // Location – presence does not need server tracking here
  const locationHook = useUnifiedLocation({
    enableTracking: false,
    enablePresence: false,
    hookId: 'presence-channel',
  });

  // Start/stop device location tracking when we have auth + vibe
  useEffect(() => {
    if (!authLoading && vibe && user?.id) {
      locationHook.startTracking();
    } else {
      locationHook.stopTracking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, vibe, user?.id]);

  // Geohash (precision 5) memoized by lat/lng only
  const gh5 = useMemo(() => {
    const c = locationHook.coords;
    if (!c) return null;

    try {
      return encodeGeohash(c.lat, c.lng, 5);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('geohash encode failed', e, c);
      }
      return null;
    }
    // only recompute if lat/lng change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationHook.coords?.lat, locationHook.coords?.lng]);

  // Subscribe + track presence when ready
  useEffect(() => {
    if (authLoading || !vibe || !gh5 || !user?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏳ usePresenceChannel waiting for:', {
          authLoading,
          vibe: !!vibe,
          gh5: !!gh5,
          profileId: !!user?.id,
        });
      }
      return;
    }

    const channelName = `vibe-${vibe}-${gh5}`;

    try {
      // Use a stable, user-unique presence key (profile id)
      const ch = supabase.channel(channelName, {
        config: { presence: { key: user.id } },
      });

      ch.on('presence', { event: 'sync' }, () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Presence sync for channel:', channelName);
        }
      });

      ch.subscribe(async (status) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('📡 Channel status:', status, 'for:', channelName);
        }

        if (status === 'SUBSCRIBED') {
          try {
            await ch.track({
              profileId: user.id,
              name:
                user.user_metadata?.username ||
                user.email?.split('@')[0] ||
                'Unknown',
              avatar: user.user_metadata?.avatar_url,
              online_at: new Date().toISOString(),
              vibe,
              gh5,
              visible: visibility !== 'off',
            });
          } catch (trackError) {
            console.warn('Failed to track presence:', trackError);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Channel connection failed:', channelName);
        }
      });

      // Cleanup on vibe / location change / unmount
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
  }, [authLoading, vibe, gh5, user?.id, visibility]);

  // Separate effect: update visibility if it changes while subscribed
  useEffect(() => {
    if (authLoading || !vibe || !gh5 || !user?.id) return;

    const channelName = `vibe-${vibe}-${gh5}`;
    try {
      const channels = supabase.getChannels();
      const existing = channels.find((ch) => ch.topic === channelName);

      if (existing && existing.state === 'joined') {
        existing
          .track({
            profileId: user.id,
            name:
              user.user_metadata?.username ||
              user.email?.split('@')[0] ||
              'Unknown',
            avatar: user.user_metadata?.avatar_url,
            online_at: new Date().toISOString(),
            vibe,
            gh5,
            visible: visibility !== 'off',
          })
          .catch((err) => {
            console.warn('Failed to update visibility:', err);
          });
      }
    } catch (err) {
      console.warn('Failed to update presence visibility:', err);
    }
  }, [authLoading, visibility, vibe, gh5, user?.id]);
};
