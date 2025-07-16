import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PendingInvitation {
  id: string;
  plan_id: string;
  plan_title: string;
  plan_date: string;
  inviter_id: string;
  inviter_name: string;
  inviter_avatar: string | null;
  invited_at: string;
  status: 'pending' | 'accepted' | 'declined';
}

/**
 * Hook to fetch pending plan invitations for the current user
 */
export function usePendingInvitations() {
  return useQuery({
    queryKey: ['pending-invitations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('plan_invitations')
        .select(`
          id,
          plan_id,
          invited_at,
          status,
          floq_plans!inner (
            title,
            planned_at
          ),
          profiles!plan_invitations_inviter_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('invitee_user_id', user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((invitation: any): PendingInvitation => ({
        id: invitation.id,
        plan_id: invitation.plan_id,
        plan_title: invitation.floq_plans?.title || 'Untitled Plan',
        plan_date: invitation.floq_plans?.planned_at || '',
        inviter_id: invitation.profiles?.id || '',
        inviter_name: invitation.profiles?.display_name || 'Someone',
        inviter_avatar: invitation.profiles?.avatar_url || null,
        invited_at: invitation.invited_at,
        status: invitation.status,
      }));
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}

/**
 * Hook to get pending invitation count for badges
 */
export function usePendingInvitationCount() {
  const { data: invitations = [] } = usePendingInvitations();
  return invitations.length;
}