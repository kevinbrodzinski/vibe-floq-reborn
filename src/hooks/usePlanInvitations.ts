import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlanInvitation {
  id: string;
  plan_id: string;
  inviter_id: string;
  invitee_email?: string;
  invitee_user_id?: string;
  status: string;
  invited_at: string;
  responded_at?: string;
}

export function usePlanInvitations(planId: string) {
  const [invitations, setInvitations] = useState<PlanInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchInvitations = async () => {
    if (!planId) return;

    try {
      const { data, error } = await supabase
        .from('plan_invitations')
        .select('*')
        .eq('plan_id', planId)
        .order('invited_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const inviteUser = async (userIdOrEmail: string, type: 'user_id' | 'email') => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const inviteData = {
        plan_id: planId,
        inviter_id: user.id,
        invitation_type: type,
        ...(type === 'email' 
          ? { invitee_email: userIdOrEmail }
          : { invitee_user_id: userIdOrEmail }
        )
      };

      const { error } = await supabase
        .from('plan_invitations')
        .insert(inviteData);

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: `Invitation sent successfully`,
      });

      await fetchInvitations();
    } catch (error: any) {
      console.error('Invite error:', error);
      toast({
        title: "Invitation failed",
        description: error.message || "Failed to send invitation",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const { error } = await supabase
        .from('plan_invitations')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      if (accept) {
        // Add user to plan participants
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('plan_participants')
            .insert({
              plan_id: planId,
              user_id: user.id,
              invite_type: 'invitation'
            });
        }
      }

      toast({
        title: accept ? "Invitation accepted" : "Invitation declined",
        description: `You have ${accept ? 'joined' : 'declined'} the plan`,
      });

      await fetchInvitations();
    } catch (error: any) {
      console.error('Response error:', { message: error.message, name: error.name });
      toast({
        title: "Error",
        description: error.message || "Failed to respond to invitation",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [planId]);

  return {
    invitations,
    isLoading,
    inviteUser,
    respondToInvitation,
    refetch: fetchInvitations
  };
}