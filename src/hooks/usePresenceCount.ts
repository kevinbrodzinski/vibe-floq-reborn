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

    // Listen to presence count updates from the database function
    const channel = supabase
      .channel('presence_counts')
      .on('broadcast', { event: 'presence_counts' }, ({ payload }) => {
        // Check if this update is for our current vibe
        if (payload.vibe === vibe) {
          setCount(payload.count || 0);
        }
      })
      .subscribe();

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