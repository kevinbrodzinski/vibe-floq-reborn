import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useVibe } from '@/lib/store/useVibe';
import { useAuth } from '@/providers/AuthProvider';

export const usePresenceChannel = () => {
  const vibe = useCurrentVibe();
  const { location } = useUserLocation();
  const { visibility } = useVibe();
  const { user } = useAuth();

  useEffect(() => {
    if (!vibe || !location || !user) return;

    // Calculate geohash-5 for presence channel
    const gh5 = location.geohash?.substring(0, 5);
    if (!gh5) return;

    const channelName = `vibe-${vibe}-${gh5}`;
    const ch = supabase.channel(channelName, { 
      config: { 
        presence: { key: channelName } 
      } 
    });

    ch
      .on('presence', { event: 'sync' }, () => {
        // Presence state is available via ch.presenceState() if needed
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ 
            userId: user.id,
            name: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
            avatar: user.user_metadata?.avatar_url,
            online_at: new Date().toISOString(),
            vibe,
            gh5,
            visible: visibility !== 'off'  // NEW: respect visibility
          });
        }
      });

    // Clean-up on vibe / location change
    return () => {
      supabase.removeChannel(ch);
    };
  }, [vibe, location?.geohash, visibility, user]);
};