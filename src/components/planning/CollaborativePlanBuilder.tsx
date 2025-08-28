import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { CalendarDays, MapPin, Clock, Users, Plus, GripVertical, Vote, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PlanStop {
  id: string;
  title: string;
  description?: string;
  venue_id?: string;
  start_time?: string;
  end_time?: string;
  estimated_cost_per_person?: number;
  order_index: number;
  votes?: PlanStopVote[];
  venue?: {
    name: string;
    address?: string;
  };
}

interface PlanStopVote {
  id: string;
  profile_id: string;
  vote_type: 'love' | 'like' | 'neutral' | 'dislike' | 'veto';
  comment?: string;
  profile?: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface Plan {
  id: string;
  title: string;
  description?: string;
  status: 'planning' | 'confirmed' | 'active' | 'completed';
  created_by: string;
  created_at: string;
  stops: PlanStop[];
  participants: Array<{
    profile_id: string;
    role: 'creator' | 'collaborator' | 'viewer';
    profile: {
      username?: string;
      display_name?: string;
      avatar_url?: string;
    };
  }>;
}

interface CollaborativePlanBuilderProps {
  planId: string;
}

export const CollaborativePlanBuilder: React.FC<CollaborativePlanBuilderProps> = ({ planId }) => {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();
  const [newStopTitle, setNewStopTitle] = useState('');
  const [newStopDescription, setNewStopDescription] = useState('');
  const [isAddingStop, setIsAddingStop] = useState(false);

  // Placeholder implementation for plan data
  const { data: plan, isLoading } = useQuery({
    queryKey: ['collaborative-plan', planId],
    queryFn: async (): Promise<Plan> => {
      return {
        id: planId,
        title: 'Sample Plan',
        description: 'A collaborative plan',
        status: 'planning',
        created_by: currentUserId || '',
        created_at: new Date().toISOString(),
        stops: [],
        participants: []
      } as Plan;
    },
  });

  // Add new stop
  const addStopMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...(plan?.stops.map(s => s.order_index) || [0]));
      
      const { error } = await supabase
        .from('plan_stops')
        .insert({
          plan_id: planId,
          title: newStopTitle,
          description: newStopDescription || null,
          order_index: maxOrder + 1
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-plan', planId] });
      setNewStopTitle('');
      setNewStopDescription('');
      setIsAddingStop(false);
      toast.success('Stop added to plan');
    },
    onError: () => {
      toast.error('Failed to add stop');
    }
  });

  // Vote on stop
  const voteMutation = useMutation({
    mutationFn: async ({ stopId, voteType, comment }: { 
      stopId: string; 
      voteType: PlanStopVote['vote_type'];
      comment?: string;
    }) => {
      const { error } = await supabase
        .from('plan_stop_votes')
        .upsert({
          stop_id: stopId,
          profile_id: currentUserId,
          vote_type: voteType,
          comment: comment || null
        }, {
          onConflict: 'stop_id,profile_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-plan', planId] });
      toast.success('Vote recorded');
    },
    onError: () => {
      toast.error('Failed to record vote');
    }
  });

  // Reorder stops
  const reorderStopsMutation = useMutation({
    mutationFn: async (reorderedStops: PlanStop[]) => {
      const updates = reorderedStops.map((stop, index) => ({
        id: stop.id,
        order_index: index
      }));

      const { error } = await supabase
        .from('plan_stops')
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborative-plan', planId] });
    },
    onError: () => {
      toast.error('Failed to reorder stops');
    }
  });

  // Real-time subscription for plan changes
  useEffect(() => {
    const channel = supabase
      .channel(`plan-changes-${planId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_stops',
          filter: `plan_id=eq.${planId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['collaborative-plan', planId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plan_stop_votes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['collaborative-plan', planId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, queryClient]);

  const handleDragEnd = (result: any) => {
    if (!result.destination || !plan) return;

    const reorderedStops = Array.from(plan.stops);
    const [reorderedItem] = reorderedStops.splice(result.source.index, 1);
    reorderedStops.splice(result.destination.index, 0, reorderedItem);

    reorderStopsMutation.mutate(reorderedStops);
  };

  const getVoteIcon = (voteType: PlanStopVote['vote_type']) => {
    switch (voteType) {
      case 'love': return '❤️';
      case 'like': return '👍';
      case 'neutral': return '🤷';
      case 'dislike': return '👎';
      case 'veto': return '❌';
    }
  };

  const getVoteColor = (voteType: PlanStopVote['vote_type']) => {
    switch (voteType) {
      case 'love': return 'text-red-500';
      case 'like': return 'text-green-500';
      case 'neutral': return 'text-gray-500';
      case 'dislike': return 'text-yellow-500';
      case 'veto': return 'text-red-600';
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading plan...</div>;
  }

  if (!plan) {
    return <div className="p-4">Plan not found</div>;
  }

  const currentUserParticipant = plan.participants.find(p => p.profile_id === currentUserId);
  const canEdit = currentUserParticipant?.role !== 'viewer';

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{plan.title}</CardTitle>
              {plan.description && (
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              )}
            </div>
            <Badge variant={plan.status === 'planning' ? 'secondary' : 'default'}>
              {plan.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">{plan.participants.length} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              <span className="text-sm">
                Created {formatDistanceToNow(new Date(plan.created_at))} ago
              </span>
            </div>
          </div>
          
          {/* Participants */}
          <div className="flex items-center gap-2 mt-4">
            {plan.participants.map((participant) => (
              <Avatar key={participant.profile_id} className="w-6 h-6">
                <AvatarImage src={participant.profile.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {participant.profile.display_name?.[0] || participant.profile.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Stops */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Plan Stops</h3>
          {canEdit && (
            <Dialog open={isAddingStop} onOpenChange={setIsAddingStop}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stop
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Stop</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Stop title"
                      value={newStopTitle}
                      onChange={(e) => setNewStopTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Description (optional)"
                      value={newStopDescription}
                      onChange={(e) => setNewStopDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => addStopMutation.mutate()}
                    disabled={!newStopTitle || addStopMutation.isPending}
                    className="w-full"
                  >
                    Add Stop
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="plan-stops">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {plan.stops.map((stop, index) => (
                  <Draggable key={stop.id} draggableId={stop.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${snapshot.isDragging ? 'shadow-lg' : ''}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="mt-1 text-muted-foreground hover:text-foreground cursor-move"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium">{stop.title}</h4>
                                  {stop.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {stop.description}
                                    </p>
                                  )}
                                  {stop.venue && (
                                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      {stop.venue.name}
                                    </div>
                                  )}
                                </div>
                                
                                <Badge variant="outline">#{index + 1}</Badge>
                              </div>
                              
                              {/* Voting Section */}
                              <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Vote className="w-4 h-4" />
                                  <span className="text-sm font-medium">Vote:</span>
                                  {(['love', 'like', 'neutral', 'dislike', 'veto'] as const).map((voteType) => (
                                    <Button
                                      key={voteType}
                                      size="sm"
                                      variant="ghost"
                                      className={`h-8 ${getVoteColor(voteType)}`}
                                      onClick={() => voteMutation.mutate({ stopId: stop.id, voteType })}
                                    >
                                      {getVoteIcon(voteType)}
                                    </Button>
                                  ))}
                                </div>
                                
                                {/* Vote Summary */}
                                {stop.votes && stop.votes.length > 0 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    {(['love', 'like', 'neutral', 'dislike', 'veto'] as const).map((voteType) => {
                                      const count = stop.votes?.filter(v => v.vote_type === voteType).length || 0;
                                      return count > 0 ? (
                                        <span key={voteType} className="flex items-center gap-1">
                                          {getVoteIcon(voteType)} {count}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};