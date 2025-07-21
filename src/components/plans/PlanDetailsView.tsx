
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Edit, Users, Calendar, MapPin, Clock } from 'lucide-react';
import { PlanEditModal } from './PlanEditModal';
import { useAuth } from '@/providers/AuthProvider';
import { PlanStatusTag } from '@/components/PlanStatusTag';
import { getStatusBadgeProps } from '@/lib/planStatusConfig';
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import type { PlanStatus } from '@/types/enums/planStatus';

type Plan = Database['public']['Tables']['floq_plans']['Row'];
type PlanParticipant = Database['public']['Tables']['plan_participants']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface PlanParticipantWithProfile extends PlanParticipant {
  profiles?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
}

export const PlanDetailsView: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { validateTransition, getAvailableTransitions } = usePlanStatusValidation();

  // Fetch plan details
  const { data: plan, isLoading: planLoading, error: planError } = useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      if (!planId) throw new Error('Plan ID is required');
      
      const { data, error } = await supabase
        .from('floq_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data as Plan;
    },
    enabled: !!planId,
  });

  // Fetch plan participants with profiles using a two-step approach
  const { data: participants = [], isLoading: participantsLoading } = useQuery({
    queryKey: ['plan-participants', planId],
    queryFn: async (): Promise<PlanParticipantWithProfile[]> => {
      if (!planId) return [];

      // Step 1: Get plan participants
      const { data: participantData, error: participantError } = await supabase
        .from('plan_participants')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          is_guest,
          guest_name
        `)
        .eq('plan_id', planId);

      if (participantError) throw participantError;
      if (!participantData?.length) return [];

      // Step 2: Get profiles for non-guest participants
      const userIds = participantData
        .filter(p => !p.is_guest && p.user_id)
        .map(p => p.user_id)
        .filter(Boolean) as string[];

      let profilesData: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>[] = [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.warn('Failed to fetch profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Step 3: Combine data
      return participantData.map(participant => ({
        ...participant,
        profiles: participant.is_guest 
          ? null 
          : profilesData.find(profile => profile.id === participant.user_id) || null
      }));
    },
    enabled: !!planId,
  });

  // Plan RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ join }: { join: boolean }) => {
      if (!planId || !session?.user?.id) throw new Error('Missing required data');

      if (join) {
        const { error } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: planId,
            user_id: session.user.id,
            role: 'participant'
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_participants')
          .delete()
          .eq('plan_id', planId)
          .eq('user_id', session.user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] });
    },
  });

  if (planLoading || participantsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Plan not found</h2>
          <p className="text-muted-foreground mb-4">
            The plan you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/plans')}>
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  const isCreator = plan.creator_id === session?.user?.id;
  const userParticipation = participants.find(p => p.user_id === session?.user?.id);
  const isParticipant = !!userParticipation;
  
  const validationContext = {
    hasParticipants: participants.length > 0,
    isCreator,
    hasStops: false, // TODO: Add plan stops logic
    isActive: plan.status === 'active'
  };

  const availableTransitions = getAvailableTransitions(
    plan.status as PlanStatus, 
    validationContext
  );

  const handleRsvp = () => {
    rsvpMutation.mutate({ join: !isParticipant });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1 truncate">{plan.title}</h1>
          {isCreator && (
            <Button variant="ghost" size="icon" onClick={() => setEditModalOpen(true)}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Plan Info Card */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{plan.title}</h2>
              {plan.description && (
                <p className="text-muted-foreground">{plan.description}</p>
              )}
            </div>
            <PlanStatusTag status={plan.status as PlanStatus} />
          </div>

          <Separator />

          {/* Plan Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{format(new Date(plan.planned_at), 'PPP')}</span>
            </div>
            
            {plan.start_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{plan.start_time}</span>
                {plan.end_time && <span>- {plan.end_time}</span>}
              </div>
            )}

            {plan.max_participants && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{participants.length} / {plan.max_participants} participants</span>
              </div>
            )}
          </div>

          {/* RSVP Section */}
          {session?.user && !isCreator && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isParticipant ? 'You\'re going' : 'Are you going?'}
                </span>
                <Button
                  variant={isParticipant ? 'secondary' : 'default'}
                  size="sm"
                  onClick={handleRsvp}
                  disabled={rsvpMutation.isPending}
                >
                  {rsvpMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isParticipant ? (
                    'Leave Plan'
                  ) : (
                    'Join Plan'
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Participants */}
        {participants.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants ({participants.length})
            </h3>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    {participant.profiles?.avatar_url ? (
                      <AvatarImage 
                        src={participant.profiles.avatar_url} 
                        alt={participant.profiles.display_name || participant.profiles.username || 'User'} 
                      />
                    ) : null}
                    <AvatarFallback>
                      {participant.is_guest 
                        ? participant.guest_name?.charAt(0).toUpperCase() || 'G'
                        : (participant.profiles?.display_name?.charAt(0) || 
                           participant.profiles?.username?.charAt(0) || 
                           '?').toUpperCase()
                      }
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {participant.is_guest 
                        ? participant.guest_name || 'Guest User'
                        : (participant.profiles?.username || participant.profiles?.display_name || 'Unknown User')
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {participant.role === 'creator' ? 'Creator' : 'Participant'}
                    </p>
                  </div>
                  {participant.role === 'creator' && (
                    <Badge variant="outline" className="text-xs">
                      Creator
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Status Actions for Creator */}
        {isCreator && availableTransitions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-3">Plan Actions</h3>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((transition) => (
                <Button
                  key={transition.status}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // TODO: Implement status transition logic
                    console.log('Transition to:', transition.status);
                  }}
                >
                  {transition.label}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <PlanEditModal
          plan={plan}
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            setEditModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['plan', planId] });
          }}
        />
      )}
    </div>
  );
};
