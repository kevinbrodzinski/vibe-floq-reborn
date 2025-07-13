import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@supabase/auth-helpers-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FloqInvitation {
  id: string;
  floq_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string;
  floq: {
    title: string;
    primary_vibe: string;
  };
  inviter: {
    display_name: string;
    avatar_url?: string;
    username?: string;
  };
}

interface UsePendingInvitesReturn {
  pendingInvites: FloqInvitation[];
  pendingCount: number;
  isLoading: boolean;
  isError: boolean;
}

export function usePendingInvites(): UsePendingInvitesReturn {
  const session = useSession();
  const user = session?.user;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pending-invites", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FloqInvitation[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('floq_invitations')
        .select(`
          id,
          floq_id,
          inviter_id,
          invitee_id,
          status,
          created_at,
          responded_at,
          floqs!inner (
            title,
            primary_vibe
          ),
          profiles!floq_invitations_inviter_id_fkey (
            display_name,
            avatar_url,
            username
          )
        `)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(invite => ({
        id: invite.id,
        floq_id: invite.floq_id,
        inviter_id: invite.inviter_id,
        invitee_id: invite.invitee_id,
        status: invite.status as 'pending' | 'accepted' | 'declined',
        created_at: invite.created_at,
        responded_at: invite.responded_at || undefined,
        floq: {
          title: invite.floqs.title,
          primary_vibe: invite.floqs.primary_vibe,
        },
        inviter: {
          display_name: invite.profiles.display_name,
          avatar_url: invite.profiles.avatar_url || undefined,
          username: invite.profiles.username || undefined,
        },
      })) || [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Realtime subscription for invite updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`invites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floq_invitations',
          filter: `invitee_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate and refetch pending invites
          queryClient.invalidateQueries({
            queryKey: ["pending-invites", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    pendingInvites: query.data || [],
    pendingCount: query.data?.length || 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}