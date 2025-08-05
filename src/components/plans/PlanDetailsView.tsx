
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, Calendar, Clock, Users, MapPin } from 'lucide-react';
import { PlanEditModal } from './PlanEditModal';
import { PlanTimelinePreview } from './PlanTimelinePreview';
import { PlanSummaryStats } from './PlanSummaryStats';
import { PlanParticipantsList } from './PlanParticipantsList';
import { PlanQuickActions } from './PlanQuickActions';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import { PlanStatusTag } from '@/components/PlanStatusTag';
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation';
import { usePlanStops } from '@/hooks/usePlanStops';
import { usePlanParticipantsOptimized } from '@/hooks/usePlanParticipantsOptimized';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/Database';
import type { PlanStatus } from '@/types/enums/planStatus';
import { zIndex } from '@/constants/z';

type Plan = Database['public']['Tables']['floq_plans']['Row'];

export const PlanDetailsView: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
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

  // Fetch plan stops
  const { data: rawStops = [], isLoading: stopsLoading } = usePlanStops(planId!);
  
  // Transform PlanStop[] to PlanStopUi[] for component compatibility
  const stops = rawStops.map(stop => ({
    id: stop.id,
    title: stop.title,
    venue: {
      id: '', // We don't have venue ID from the current data structure
      name: stop.venue,
      address: stop.address
    },
    description: stop.description,
    start_time: stop.start_time,
    end_time: stop.end_time,
    stop_order: stop.stop_order || 0,
    address: stop.address,
    duration_minutes: stop.duration_minutes,
    estimated_cost_per_person: stop.estimated_cost_per_person
  }));

  // Fetch plan participants
  const { data: participants = [], isLoading: participantsLoading } = usePlanParticipantsOptimized(planId!);

  // Plan RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ join }: { join: boolean }) => {
      if (!planId || !session?.user?.id) throw new Error('Missing required data');

      if (join) {
        const { error } = await supabase
          .from('plan_participants')
          .upsert({
            plan_id: planId,
            profile_id: session.user.id,
            role: 'participant'
          }, {
            onConflict: 'plan_id,profile_id'
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('plan_participants')
          .delete()
          .eq('plan_id', planId)
          .eq('profile_id', session.user.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, { join }) => {
      queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] });
      toast({
        title: join ? "You're in!" : "You've left the plan",
        description: join ? "You've successfully joined this plan" : "You've been removed from this plan",
      });
    },
    onError: (error) => {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Status transition mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status }: { status: PlanStatus }) => {
      if (!planId) throw new Error('Plan ID is required');
      
      const { error } = await supabase
        .from('floq_plans')
        .update({ status })
        .eq('id', planId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      toast({
        title: "Status updated",
        description: "Plan status has been updated successfully",
      });
    },
  });

  if (planLoading) {
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
  const userParticipation = participants.find(p => p.profile_id === session?.user?.id);
  const isParticipant = !!userParticipation;
  
  const validationContext = {
    hasParticipants: participants.length > 0,
    isCreator,
    hasStops: stops.length > 0,
    isActive: plan.status === 'active'
  };

  const availableTransitions = getAvailableTransitions(
    plan.status as PlanStatus, 
    validationContext
  );

  const handleRsvp = () => {
    rsvpMutation.mutate({ join: !isParticipant });
  };

  const handleStatusChange = (status: PlanStatus) => {
    statusMutation.mutate({ status });
  };

  const handleEditTimeline = () => {
    navigate(`/plan/${planId}`);
  };

  const handleInviteMore = () => {
    toast({
      title: "Coming soon",
      description: "Invite functionality will be available soon",
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['plan', planId] });
    queryClient.invalidateQueries({ queryKey: ['plan-participants', planId] });
    queryClient.invalidateQueries({ queryKey: ['plan-stops', planId] });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b" {...zIndex('uiHeader')}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1 truncate">{plan.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Plan Header Card */}
        <Card className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <h2 className="text-xl font-semibold">{plan.title}</h2>
              {plan.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {plan.description}
                </p>
              )}
            </div>
            <PlanStatusTag status={plan.status as PlanStatus} />
          </div>

          <Separator />

          {/* Plan Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{format(new Date(plan.planned_at), 'EEEE, MMMM d, yyyy')}</span>
            </div>
            
            {plan.start_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{plan.start_time}</span>
                {plan.end_time && <span>- {plan.end_time}</span>}
                {plan.duration_hours && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {plan.duration_hours}h
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
                {plan.max_participants && ` (max ${plan.max_participants})`}
              </span>
            </div>

            {stops.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{stops.length} stop{stops.length !== 1 ? 's' : ''} planned</span>
              </div>
            )}
          </div>

          {/* RSVP Section */}
          {session?.user && !isCreator && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {isParticipant ? 'You\'re going to this plan' : 'Want to join this plan?'}
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

        {/* Summary Stats */}
        <PlanSummaryStats 
          stops={stops}
          participantCount={participants.length}
          maxParticipants={plan.max_participants || undefined}
        />

        {/* Quick Actions */}
        <PlanQuickActions
          planId={planId!}
          planTitle={plan.title}
          isCreator={isCreator}
          onEditPlan={() => setEditModalOpen(true)}
          onEditTimeline={handleEditTimeline}
        />

        {/* Timeline Preview */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timeline
          </h3>
          <PlanTimelinePreview 
            stops={stops} 
            isLoading={stopsLoading}
          />
        </div>

        {/* Participants */}
        <PlanParticipantsList
          participants={participants}
          isCreator={isCreator}
          isLoading={participantsLoading}
          planId={planId}
          planTitle={plan.title}
        />

        {/* Status Actions for Creator */}
        {isCreator && availableTransitions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-3">Plan Status</h3>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((transition) => (
                <Button
                  key={transition.status}
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(transition.status)}
                  disabled={statusMutation.isPending}
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
