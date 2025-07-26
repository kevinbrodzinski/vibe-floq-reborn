/* ----------------------------------------------------------------
   useFriendRequests – realtime friend-request helper
   ---------------------------------------------------------------- */
import { useEffect } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { track } from '@/lib/analytics';
import { pushAchievementEvent } from '@/lib/achievements/pushEvent';

/* ────────────────────────── types ──────────────────────────── */
export interface FriendRequest {
  id: string;
  /* requester → receiver (this user) */
  user_id: string;             // requester
  friend_id: string;           // *this user*
  status: 'pending' | 'accepted' | 'declined';
  requested_at: string;
  /* joined profile */
  requester_profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

/* ────────────────────────── hook ──────────────────────────── */
export function useFriendRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const uid = user?.id;

  /* 1️⃣  pending requests addressed *to* the current user */
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['friend-requests', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(
          `
            id,
            user_id,
            friend_id,
            status,
            requested_at:created_at,
            requester_profile:profiles!friend_requests_user_id_fkey(
              id, username, display_name, avatar_url
            )
          `
        )
        .eq('friend_id', uid!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FriendRequest[];
    },
    staleTime: 15_000,
  });

  /* 2️⃣  realtime – INSERT / UPDATE on friend_requests */
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`friend-requests:${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `friend_id=eq.${uid}`,
        },
        () => qc.invalidateQueries({ queryKey: ['friend-requests', uid] })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [uid, qc]);

  /* 3️⃣  accept / decline / send helpers (SQL updates) */
  const acceptRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('friend_id', uid!);

      if (error) throw error;
      return requestId;
    },
    onSuccess: (rid) => {
      qc.invalidateQueries({ queryKey: ['friend-requests', uid] });
      qc.invalidateQueries({ queryKey: ['friends', uid] });
      pushAchievementEvent('friend_added', { request_id: rid });
      toast({ title: 'Friend request accepted ✅' });
    },
    onError: (e) =>
      toast({
        title: 'Failed to accept',
        description: (e as Error).message,
        variant: 'destructive',
      }),
  });

  const declineRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'declined' })
        .eq('id', requestId)
        .eq('friend_id', uid!);
      if (error) throw error;
      return requestId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friend-requests', uid] });
      track('friend_request_declined');
      toast({ title: 'Request declined' });
    },
    onError: (e) =>
      toast({
        title: 'Failed to decline',
        description: (e as Error).message,
        variant: 'destructive',
      }),
  });

  /*  sender: create or re-open (status=pending) */
  const sendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!uid) throw new Error('Not authenticated');

      /* upsert handles:
         – new request if none
         – resurrect if previously declined
         – noop if already pending / friends
      */
      const { error } = await supabase.rpc('send_friend_request', {
        requester_id_param: uid,
        addressee_id_param: targetUserId,
      });

      if (error) throw error;
      return targetUserId;
    },
    onSuccess: () => {
      toast({ title: 'Friend request sent 🎉' });
    },
    onError: (e) =>
      toast({
        title: 'Failed to send',
        description: (e as Error).message,
        variant: 'destructive',
      }),
  });

  return {
    pendingRequests: pending,
    isLoading,

    acceptRequest: acceptRequest.mutateAsync,
    declineRequest: declineRequest.mutateAsync,
    sendRequest: sendRequest.mutateAsync,

    isAccepting: acceptRequest.isPending,
    isDeclining: declineRequest.isPending,
    isSending: sendRequest.isPending,
  };
}