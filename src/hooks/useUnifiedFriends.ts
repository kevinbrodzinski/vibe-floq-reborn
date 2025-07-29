/* ------------------------------------------------------------------
   useUnifiedFriends – ONE hook for
     • accepted friends
     • incoming / outgoing requests
     • live presence   (via view  v_friends_with_presence)
   ------------------------------------------------------------------ */
import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeFriendsChannel } from '@/lib/realtime/subscribeFriendsChannel';

/* ─────── database row returned by the view ─────── */
export interface FriendRow {
  friend_id:      string;
  display_name:   string | null;
  username:       string | null;
  avatar_url:     string | null;
  online:         boolean;
  started_at:     string | null;
  vibe_tag:       string | null;
  request_status: 'pending' | 'accepted' | null;  // null means already accepted (legacy)
  request_id:     string | null;
}

/* ─────── main hook ─────── */
export function useUnifiedFriends() {
  const { user } = useAuth();
  const uid      = user?.id;
  const qc       = useQueryClient();

  /* 1️⃣  fetch list (30 s cache; comes from the VIEW) */
  const { data = [], isLoading } = useQuery({
    queryKey : ['friends-unified', uid],
    enabled  : !!uid,
    staleTime: 30_000,
    queryFn  : async (): Promise<FriendRow[]> => {
      const { data, error } = await supabase
        .from('v_friends_with_presence' as any)
        .select('*')
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      return (data as unknown as FriendRow[]) ?? [];
    }
  });

  /* 2️⃣  realtime invalidation (friends / requests / presence) */
  useEffect(() => {
    if (!uid) return;
    const ch = subscribeFriendsChannel(uid, () =>
      qc.invalidateQueries({ queryKey: ['friends-unified', uid] })
    );
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, qc]);

  /* 3️⃣  single mutate helper (send / accept / decline / block) */
  const mutate = useMutation({
    mutationFn : async ({ other, state }: { other: string; state: 'pending'|'accepted'|'blocked'|'declined' }) => {
      const { data, error } = await supabase.rpc('upsert_friendship' as any, { 
        target_user_id: other, 
        new_state: state 
      });
      if (error) throw error;
      return data;
    },
    onSuccess  : () => qc.invalidateQueries({ queryKey: ['friends-unified', uid] })
  });

  /* 4️⃣  handy derived arrays */
  const acceptedIds   = data.filter(r => r.request_status === 'accepted' || r.request_status === null)
                            .map(r => r.friend_id);
  const pendingIn     = data.filter(r => r.request_status === 'pending' && r.request_id && r.friend_id === uid);
  const pendingOut    = data.filter(r => r.request_status === 'pending' && (!r.request_id || r.friend_id !== uid));

  /* 5️⃣  public API  */
  return {
    data,
    isLoading,
    friends: acceptedIds,              // ✔ list of friend IDs
    pendingIn,
    pendingOut,

    sendRequest: (id: string) => mutate.mutate({ other: id, state: 'pending' }),
    accept:      (id: string) => mutate.mutate({ other: id, state: 'accepted' }),
    decline:     (id: string) => mutate.mutate({ other: id, state: 'declined' }),
    block:       (id: string) => mutate.mutate({ other: id, state: 'blocked' }),

    isFriend:  (id: string) => acceptedIds.includes(id),
    loading:   mutate.isPending,
  };
}