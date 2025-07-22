import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PlanInvitation {
  id: string;
  plan_id: string;
  inviter_id: string;
  invitee_email?: string;
  invitee_user_id?: string;
  status: string;
  invited_at: string;
  responded_at?: string;
  archived: boolean;
  plan: {
    id: string;
    title: string;
    description?: string;
    planned_at: string;
    vibe_tags?: string[];
    floq_id: string;
    floq?: {
      id: string;
      name: string;
      title: string;
      primary_vibe: string;
    };
  };
}

type GroupingMode = 'floq' | 'plan_type';

export function useUserInvitations(groupBy: GroupingMode = 'floq') {
  const [invitations, setInvitations] = useState<PlanInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchInvitations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('plan_invitations')
        .select(`
          id,
          plan_id,
          inviter_id,
          status,
          invited_at,
          responded_at,
          archived,
          plan:plan_id (
            id,
            title,
            description,
            planned_at,
            vibe_tags,
            floq_id,
            floq:floq_id (
              id,
              name,
              title,
              primary_vibe
            )
          )
        `)
        .eq('invitee_user_id', user.id)
        .eq('status', 'pending')
        .eq('archived', false)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, []);

  const grouped = useMemo(() => {
    const groups = new Map<string, PlanInvitation[]>();
    
    for (const invite of invitations) {
      const key = groupBy === 'floq'
        ? invite.plan.floq?.id ?? 'ungrouped'
        : invite.plan.vibe_tags?.[0] ?? 'general';

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(invite);
    }
    
    return groups;
  }, [invitations, groupBy]);

  const respondToInvitation = useCallback(async (inviteId: string, planId: string, accept: boolean) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update invitation status
      const { error: inviteError } = await supabase
        .from('plan_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString(),
          archived: true,
        })
        .eq('id', inviteId);

      if (inviteError) throw inviteError;

      if (accept) {
        // Add user to plan participants with conflict handling
        const { error: participantError } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: planId,
            user_id: user.id,
            invite_type: 'invitation',
          })
          .select()
          .single();

        // Handle duplicate participant gracefully
        if (participantError && !participantError.message?.includes('duplicate')) {
          throw participantError;
        }

        // Navigate to plan with delay for better UX
        setTimeout(() => {
          navigate(`/plan/${planId}`);
        }, 1000);
      } else {
        // Log decline for preferences learning
        await supabase.rpc('log_invite_decline', {
          p_user_id: user.id,
          p_plan_id: planId
        });
      }

      toast({
        title: accept ? "Invitation accepted" : "Invitation declined",
        description: accept ? "Redirecting to plan..." : "Thanks for letting us know",
      });

      // Remove from local state immediately
      setInvitations(prev => prev.filter(inv => inv.id !== inviteId));

    } catch (error: any) {
      console.error('Response error:', { message: error.message, name: error.name });
      toast({
        title: "Error",
        description: error.message || "Failed to respond to invitation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, navigate]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    grouped,
    isLoading,
    respondToInvitation,
    refetch: fetchInvitations
  };
}