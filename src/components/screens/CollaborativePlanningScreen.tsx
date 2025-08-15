import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  Users, 
  MessageCircle, 
  Settings,
  Sparkles,
  Clock,
  Play,
  Save,
  Share2,
  MoreHorizontal,
  Filter,
  SortAsc
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

// Hooks
import { usePlan } from '@/hooks/usePlan';
import { usePlanStops } from '@/hooks/usePlanStops';
import { useUnifiedPlanStops } from '@/hooks/useUnifiedPlanStops';
import { usePlanPresence } from '@/hooks/usePlanPresence';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

// Components
import { CollaborativeStopCard } from '@/components/planning/CollaborativeStopCard';
import { ComprehensiveStopModal } from '@/components/plans/ComprehensiveStopModal';
import { NovaSuggestions } from '@/components/planning/NovaSuggestions';
import { supabase } from '@/integrations/supabase/client';

export const CollaborativePlanningScreen = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showNovaSuggestions, setShowNovaSuggestions] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'votes' | 'status'>('time');
  const [filterBy, setFilterBy] = useState<'all' | 'confirmed' | 'pending' | 'needs_votes'>('all');
  const [editingStop, setEditingStop] = useState<any>(null);

  // Validate planId
  if (!planId) {
    throw new Error('Plan ID is required but not provided in URL params');
  }

  // Data hooks
  const { data: plan, isLoading: isPlanLoading } = usePlan(planId);
  const { data: stops = [], isLoading: isStopsLoading } = usePlanStops(planId);
  const { onlineUsers, totalOnline } = usePlanPresence(planId);
  
  // Unified stop operations
  const { 
    createStop, 
    deleteStop, 
    reorderStops,
    isCreating,
    isDeleting 
  } = useUnifiedPlanStops(planId);

  // Query client for cache invalidation
  const queryClient2 = useQueryClient();

  /** Update a stop in DB and refresh cached list. */
  const updateStop = React.useCallback(
    async (id: string, patch: Partial<any>) => {
      const dbPatch: Record<string, any> = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if ((patch as any).description !== undefined) dbPatch.description = (patch as any).description;

      const start = (patch as any).start_time ?? (patch as any).start;
      const end   = (patch as any).end_time   ?? (patch as any).end;
      if (start !== undefined) dbPatch.start_time = start instanceof Date ? start.toISOString() : start;
      if (end   !== undefined) dbPatch.end_time   = end   instanceof Date ? end.toISOString()   : end;

      if ((patch as any).venue_id !== undefined) dbPatch.venue_id = (patch as any).venue_id;
      if ((patch as any).order_index !== undefined) dbPatch.order_index = (patch as any).order_index;
      if ((patch as any).status !== undefined) dbPatch.status = (patch as any).status;
      if ((patch as any).stop_order !== undefined) dbPatch.stop_order = (patch as any).stop_order;

      const { error } = await supabase.from('plan_stops').update(dbPatch).eq('id', id);
      if (error) throw error;

      await queryClient2.invalidateQueries({ queryKey: ['plan-stops', planId] });
    },
    [planId, queryClient2]
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex(stop => stop.id === active.id);
      const newIndex = stops.findIndex(stop => stop.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedStops = arrayMove(stops, oldIndex, newIndex);
        
        // Update stop orders
        try {
          await Promise.all(
            reorderedStops.map((stop, index) => 
              updateStop(stop.id, { stop_order: index + 1 })
            )
          );
          toast({ title: "Timeline reordered successfully" });
        } catch (error) {
          console.error('Failed to reorder stops:', error);
          toast({
            title: "Failed to reorder timeline",
            description: "Please try again",
            variant: "destructive",
          });
        }
      }
    }
  }, [stops, updateStop, toast]);

  // Handle stop actions
  const handleEditStop = useCallback((stop: any) => {
    setEditingStop(stop);
    setShowAddStopModal(true);
  }, []);

  const handleDeleteStop = useCallback(async (stopId: string) => {
    if (confirm('Are you sure you want to delete this stop?')) {
      try {
        await deleteStop(stopId);
        toast({ title: "Stop deleted successfully" });
      } catch (error) {
        toast({
          title: "Failed to delete stop",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  }, [deleteStop, toast]);

  const handleVoteChange = useCallback((stopId: string, upVotes: number, downVotes: number) => {
    // Optional: Update local state or trigger additional actions based on vote changes
    console.log(`Stop ${stopId} votes: ${upVotes} up, ${downVotes} down`);
  }, []);

  // Filter and sort stops
  const processedStops = useMemo(() => {
    let filtered = stops;

    // Apply filters
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'confirmed':
          filtered = stops.filter(stop => stop.status === 'confirmed');
          break;
        case 'pending':
          filtered = stops.filter(stop => stop.status === 'pending');
          break;
        case 'needs_votes':
          // This would require vote data - for now just show pending
          filtered = stops.filter(stop => stop.status === 'pending');
          break;
      }
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'time':
          if (!a.start_time && !b.start_time) return 0;
          if (!a.start_time) return 1;
          if (!b.start_time) return -1;
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        case 'status':
          const statusOrder = { 'confirmed': 0, 'pending': 1, 'draft': 2, 'cancelled': 3 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 2) - (statusOrder[b.status as keyof typeof statusOrder] || 2);
        case 'votes':
          // Would need vote data - for now sort by stop_order
          return (a.stop_order || 0) - (b.stop_order || 0);
        default:
          return (a.stop_order || 0) - (b.stop_order || 0);
      }
    });

    return sorted;
  }, [stops, sortBy, filterBy]);

  const isCreator = plan?.creator_id === session?.user?.id;

  if (isPlanLoading || isStopsLoading) {
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

  if (!plan) {
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

  return (
    <div className="min-h-screen bg-gradient-field">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-field/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/plans/${planId}`)}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Plan Details
            </Button>
            
            <div className="hidden sm:block">
              <h1 className="font-semibold text-white truncate max-w-[200px]">
                {plan.title}
              </h1>
              <p className="text-xs text-white/60">Timeline Editor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online Users */}
            {totalOnline > 0 && (
              <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-white">{totalOnline} online</span>
                <div className="flex -space-x-1 ml-1">
                  {onlineUsers.slice(0, 3).map((user, index) => (
                    <Avatar key={user.userId} className="w-5 h-5 border border-white/20">
                      <AvatarImage src={user.avatarUrl || ''} />
                      <AvatarFallback className="bg-gradient-primary text-xs">
                        {user.displayName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/plans/${planId}`)}
              className="text-white hover:bg-white/10"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/10"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 border-white/20">
                <DropdownMenuItem className="text-white hover:bg-white/10">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Timeline
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-white/10">
                  <Save className="w-4 h-4 mr-2" />
                  Export Timeline
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/20" />
                <DropdownMenuItem className="text-white hover:bg-white/10">
                  <Settings className="w-4 h-4 mr-2" />
                  Timeline Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24 space-y-6">
        {/* Control Bar */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAddStopModal(true)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stop
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNovaSuggestions(!showNovaSuggestions)}
                  className={`border-white/20 text-white hover:bg-white/10 ${showNovaSuggestions ? 'bg-white/10' : ''}`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Suggestions
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {filterBy === 'all' ? 'All' : 
                       filterBy === 'confirmed' ? 'Confirmed' :
                       filterBy === 'pending' ? 'Pending' : 'Needs Votes'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black/90 border-white/20">
                    <DropdownMenuItem onClick={() => setFilterBy('all')} className="text-white hover:bg-white/10">
                      All Stops
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy('confirmed')} className="text-white hover:bg-white/10">
                      Confirmed Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy('pending')} className="text-white hover:bg-white/10">
                      Pending Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterBy('needs_votes')} className="text-white hover:bg-white/10">
                      Needs Votes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <SortAsc className="w-4 h-4 mr-2" />
                      {sortBy === 'time' ? 'Time' : 
                       sortBy === 'votes' ? 'Votes' : 'Status'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-black/90 border-white/20">
                    <DropdownMenuItem onClick={() => setSortBy('time')} className="text-white hover:bg-white/10">
                      Sort by Time
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('status')} className="text-white hover:bg-white/10">
                      Sort by Status
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('votes')} className="text-white hover:bg-white/10">
                      Sort by Votes
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </Card>

        {/* AI Suggestions */}
        {showNovaSuggestions && (
          <NovaSuggestions
            planId={planId}
            existingStops={stops}
            timeRange={{ start: "18:00", end: "23:59" }}
            participants={totalOnline}
            onAcceptSuggestion={async (suggestion) => {
              try {
                await createStop({
                  title: suggestion.title,
                  description: `AI suggested: ${suggestion.venue || suggestion.location}`,
                  start_time: suggestion.startTime,
                  end_time: suggestion.endTime,
                  duration_minutes: 60,
                  venue: suggestion.venue,
                  estimated_cost: suggestion.estimatedCost
                });
                toast({ title: "AI suggestion added to timeline!" });
              } catch (error) {
                console.error('Failed to add AI suggestion:', error);
                toast({
                  title: "Failed to add suggestion",
                  description: "Please try again",
                  variant: "destructive",
                });
              }
            }}
            onDismiss={() => setShowNovaSuggestions(false)}
          />
        )}

        {/* Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timeline ({processedStops.length} stops)
            </h2>
            
            {processedStops.length > 0 && (
              <Badge variant="outline" className="border-white/20 text-white">
                {processedStops.filter(s => s.status === 'confirmed').length} confirmed
              </Badge>
            )}
          </div>

          {processedStops.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={processedStops.map(stop => stop.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {processedStops.map((stop, index) => (
                    <CollaborativeStopCard
                      key={stop.id}
                      stop={stop}
                      planId={planId}
                      index={index}
                      onEdit={handleEditStop}
                      onDelete={handleDeleteStop}
                      onVoteChange={handleVoteChange}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
              <div className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <h3 className="text-lg font-semibold mb-2">No stops planned yet</h3>
                <p className="text-white/70 mb-4">Start building your timeline by adding your first stop</p>
                <Button
                  onClick={() => setShowAddStopModal(true)}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Stop
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Stop Modal */}
      <ComprehensiveStopModal
        isOpen={showAddStopModal}
        onClose={() => {
          setShowAddStopModal(false);
          setEditingStop(null);
        }}
        planId={planId}
        editingStop={editingStop}
      />
    </div>
  );
};
