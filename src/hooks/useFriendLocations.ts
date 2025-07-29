import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FriendLocation {
  lat: number;
  lng: number;
  acc: number;
  ts: number;
}

export function useFriendLocations(friendIds: string[]) {
  const [spots, setSpots] = useState<Record<string, FriendLocation>>({});
  const channelsRef = useRef<any[]>([]);

  useEffect(() => {
    // Clear previous channels
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    if (!friendIds.length) return;

    // Listen to each friend's presence channel
    channelsRef.current = friendIds.map(fid =>
      supabase.channel(`presence_${fid}`)
        .on('broadcast', { event: 'live_pos' }, ({ payload }) => {
          setSpots(s => ({ ...s, [fid]: payload as FriendLocation }));
        })
        .subscribe()
    );

    return () => {
      channelsRef.current.forEach(ch => {
        if (ch) supabase.removeChannel(ch);
      });
      channelsRef.current = [];
    };
  }, [friendIds.slice().sort().join()]); // Sort for stable dependencies

  return spots; // { friendId: { lat, lng, acc, ts }, ... }
}