import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VibeEnum } from '@/constants/vibes';

export function usePresenceCount(vibe: VibeEnum | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!vibe) {
      setCount(0);
      return;
    }

    // Create a presence channel for this vibe
    // For now we'll use a simple channel name - in production we'd add geohash
    const channelName = `vibe-${vibe}`;
    
    const channel = supabase.channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const totalUsers = Object.keys(state).length;
        setCount(totalUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setCount(prev => prev + newPresences.length);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setCount(prev => Math.max(0, prev - leftPresences.length));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track our own presence
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vibe]);

  // Return bucketed count for display
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 5) return Math.min(count, 5);
  if (count <= 15) return Math.min(count, 15);
  return 15; // 15+ for anything higher
}