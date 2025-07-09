import { useEffect, useState } from 'react';
import { useFriends } from './useFriends';
import { supabase } from '@/integrations/supabase/client';

type StatusMap = Record<string, 'online' | 'away'>;

export function useFriendsPresence() {
  const { friends } = useFriends();
  const [status, setStatus] = useState<StatusMap>({});

  useEffect(() => {
    if (friends.length === 0) return;

    const channel = supabase.channel('friends-presence');

    friends.forEach(id => {
      channel.on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vibes_now', filter: `user_id=eq.${id}` },
        payload => {
          setStatus(s => ({ ...s, [id]: payload.new ? 'online' : 'away' }));
        }
      );
    });

    channel.subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [friends]);

  return status;       // { userId: 'online' | 'away' }
}