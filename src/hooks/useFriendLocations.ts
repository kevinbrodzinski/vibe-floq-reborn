import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FriendLocation {
  lat: number;
  lng: number;
  acc: number;
  ts: number;
}

export function useFriendLocations(friendIds: string[]) {
  const [spots, setSpots] = useState<Record<string, FriendLocation>>({});

  useEffect(() => {
    if (!friendIds.length) return;

    const channels = friendIds.map(fid =>
      supabase.channel(`presence_${fid}`)
        .on('broadcast', { event: 'live_pos' }, ({ payload }) => {
          setSpots(s => ({ ...s, [fid]: payload }));
        })
        .subscribe()
    );

    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [friendIds.join()]); // stringify so React compares properly

  return spots; // { friendId: { lat, lng, acc, ts }, ... }
}