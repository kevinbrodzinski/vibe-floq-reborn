
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Share2, 
  MessageCircle, 
  Edit3,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Heart,
  MessageSquare,
  Bookmark,
  ExternalLink,
  DollarSign,
  Star
} from 'lucide-react';
import { PlanEditModal } from './PlanEditModal';
import { useAuth } from '@/hooks/useAuth';
import { PlanStatusTag } from '@/components/PlanStatusTag';
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation';
import { usePlanStops } from '@/hooks/usePlanStops';
import { usePlanParticipantsOptimized } from '@/hooks/usePlanParticipantsOptimized';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { PlanStatus } from '@/types/enums/planStatus';
import { cn } from '@/lib/utils';

type Plan = Database['public']['Tables']['floq_plans']['Row'];

export const PlanDetailsView: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
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
        .eq('id', planId as any)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });

  // Fetch stops for preview
  const { data: stops = [] } = usePlanStops(planId!);

  // Fetch participants  
  const { data: participants = [] } = usePlanParticipantsOptimized(planId!);

  const isCreator = plan?.creator_id === session?.user?.id;
  const availableTransitions = plan ? getAvailableTransitions(plan.status as PlanStatus) : [];

  // Status change mutation
  const statusMutation = useMutation({
    mutationFn: async ({ status }: { status: PlanStatus }) => {
      if (!plan || !validateTransition(plan.status as PlanStatus, status)) {
        throw new Error('Invalid status transition');
      }

      const { error } = await supabase
        .from('floq_plans')
        .update({ status })
        .eq('id', plan.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      toast({ title: "Plan status updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Error updating plan status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: PlanStatus) => {
    statusMutation.mutate({ status });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/plans/${planId}`;
    if (typeof window !== 'undefined' && window.navigator?.share) {
      try {
        await navigator.share({
          title: plan?.title || 'Check out this plan',
          text: `Join us for ${plan?.title}`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Plan link copied to clipboard",
      });
    }
  };

  const handleEditTimeline = () => {
    navigate(`/plan/${planId}`);
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-gradient-field flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md px-4">
          <div className="h-8 bg-white/10 rounded-lg"></div>
          <div className="h-32 bg-white/10 rounded-xl"></div>
          <div className="h-24 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="min-h-screen bg-gradient-field flex items-center justify-center">
        <div className="text-center text-white p-8">
          <h2 className="text-xl font-semibold mb-2">Plan not found</h2>
          <p className="text-white/70 mb-4">This plan may have been deleted or you don't have access.</p>
          <Button onClick={() => navigate('/plans')} variant="outline">
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  const confirmedStops = stops.filter(s => s.status === 'confirmed').length;
  const readinessScore = stops.length > 0 ? Math.round((confirmedStops / stops.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-field">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-field/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/plans')}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Plans
          </Button>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsLiked(!isLiked)}
              className={cn("text-white hover:bg-white/10", isLiked && "text-red-400")}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={cn("text-white hover:bg-white/10", isBookmarked && "text-yellow-400")}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
            </Button>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleShare}
              className="text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            {isCreator && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="text-white hover:bg-white/10"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Hero Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20 text-white">
          <div className="p-6 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <PlanStatusTag status={plan.status as PlanStatus} />
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span>{readinessScore}% ready</span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{plan.title}</h1>
              {plan.description && (
                <p className="text-white/80 leading-relaxed">{plan.description}</p>
              )}
            </div>

            {/* Date & Time Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-white/60" />
                <div>
                  <div className="text-sm text-white/60">Date</div>
                  <div className="font-medium">
                    {plan.date 
                      ? format(parseISO(plan.date), 'EEE, MMM d, yyyy')
                      : 'Date TBD'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-white/60" />
                <div>
                  <div className="text-sm text-white/60">Time</div>
                  <div className="font-medium">
                    {plan.start_time || '7:00 PM'} - {plan.end_time || 'Late'}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-2xl font-bold">{participants.length}</div>
                <div className="text-sm text-white/60">Going</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stops.length}</div>
                <div className="text-sm text-white/60">Stops</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {plan.budget_per_person ? `$${plan.budget_per_person}` : '—'}
                </div>
                <div className="text-sm text-white/60">Per person</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Participants */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Who's Going ({participants.length})
              </h3>
              <Button variant="ghost" size="sm" className="text-white/70 hover:bg-white/10">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-3">
              {participants.slice(0, 8).map((participant, index) => (
                <div key={participant.id} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={participant.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-primary text-xs">
                      {participant.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{participant.display_name || 'User'}</span>
                  {participant.user_id === plan.creator_id && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">Host</Badge>
                  )}
                </div>
              ))}
              {participants.length > 8 && (
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm">
                  +{participants.length - 8} more
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Timeline Preview */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Timeline ({stops.length} stops)
              </h3>
              <Button 
                onClick={handleEditTimeline}
                size="sm"
                className="bg-gradient-primary hover:opacity-90 text-white"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Timeline
              </Button>
            </div>

            {stops.length > 0 ? (
              <div className="space-y-3">
                {stops.slice(0, 4).map((stop, index) => (
                  <div key={stop.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-gradient-primary rounded-full"></div>
                      {index < stops.length - 1 && (
                        <div className="w-px h-8 bg-white/20 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{stop.title}</h4>
                        <Badge 
                          variant={stop.status === 'confirmed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {stop.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-white/60 flex items-center gap-4">
                        {stop.start_time && (
                          <span>{format(parseISO(stop.start_time), 'h:mm a')}</span>
                        )}
                        {stop.duration_minutes && (
                          <span>{stop.duration_minutes}min</span>
                        )}
                        {stop.estimated_cost_per_person && (
                          <span>${stop.estimated_cost_per_person}/person</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stops.length > 4 && (
                  <div className="text-center py-2 text-white/60 text-sm">
                    +{stops.length - 4} more stops
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-white/60">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No stops planned yet</p>
                <Button 
                  onClick={handleEditTimeline}
                  variant="outline" 
                  size="sm" 
                  className="mt-2 border-white/20 text-white hover:bg-white/10"
                >
                  Add First Stop
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleEditTimeline}
            className="h-12 bg-gradient-primary hover:opacity-90 text-white"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Timeline Editor
          </Button>
          
          <Button 
            onClick={() => navigate(`/plan/${planId}`)}
            variant="outline"
            className="h-12 border-white/20 text-white hover:bg-white/10"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Group Chat
          </Button>
        </div>

        {/* Status Actions for Creator */}
        {isCreator && availableTransitions.length > 0 && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
            <div className="p-4 space-y-3">
              <h3 className="font-medium">Plan Status Actions</h3>
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((transition) => (
                  <Button
                    key={transition.status}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(transition.status)}
                    disabled={statusMutation.isPending}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    {transition.label}
                  </Button>
                ))}
              </div>
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
