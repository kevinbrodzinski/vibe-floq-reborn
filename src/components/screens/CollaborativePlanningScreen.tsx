import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import { Search, Settings, Play, Users, MessageCircle, HelpCircle, ChevronDown, ChevronUp, Sparkles, Calendar, DollarSign, Clock, Share2, Plus } from "lucide-react";
import { useParams } from 'react-router-dom';
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutHelp } from "@/components/ui/keyboard-shortcut-help";
import { MobileTimelineGrid } from "@/components/planning/MobileTimelineGrid";
import { VirtualTimelineGrid } from "@/components/planning/VirtualTimelineGrid";
import { TimelineCanvas, type TimelineStop } from "@/components/planning/TimelineCanvas";
import { PlanInviteButton } from "@/components/PlanInviteButton";
import { CheckInStatusBadge } from "@/components/CheckInStatusBadge";
import { TimeProgressBar } from "@/components/TimeProgressBar";
import { useUnifiedPlanStops } from "@/hooks/useUnifiedPlanStops";
import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { LiveParticipantTracker } from "@/components/LiveParticipantTracker";
import { VenueCardLibrary } from "@/components/VenueCardLibrary";
import { TimelineGrid } from "@/components/planning/TimelineGrid";
import { PlanningChat } from "@/components/PlanningChat";
import { NovaSuggestions } from "@/components/planning/NovaSuggestions";
import { TimelineOverlapValidator } from "@/components/planning/TimelineOverlapValidator";
import { PlanTemplatesPanel } from "@/components/planning/PlanTemplatesPanel";
import { SocialPulseOverlay } from "@/components/SocialPulseOverlay";
import { PlanExecutionTracker } from "@/components/PlanExecutionTracker";
import { VotingThresholdMeter } from "@/components/VotingThresholdMeter";
import { TiebreakerSuggestions } from "@/components/TiebreakerSuggestions";
import { RSVPCard } from "@/components/RSVPCard";
import { SharePlanButton } from "@/components/SharePlanButton";
import { ExecutionOverlay } from "@/components/ExecutionOverlay";
import { PlanPresenceIndicator } from "@/components/PlanPresenceIndicator";
import { SummaryReviewPanel } from "@/components/SummaryReviewPanel";
import { PlanChatSidebar } from "@/components/PlanChatSidebar";
import { PlanSummaryCard } from "@/components/plan/PlanSummaryCard";
import { MobileActionMenu } from "@/components/ui/MobileActionMenu";
import { MobilePlanningTabs, Tab } from "@/components/ui/MobilePlanningTabs";
import { PlanSummaryEditModal } from "@/components/plan/PlanSummaryEditModal";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { PlanStatusActions } from "@/components/plans/PlanStatusActions";
import { PlanHero } from "@/components/plan/PlanHero";
import { KpiChip } from "@/components/plan/KpiChip";
import { TimelineStop } from "@/components/plan/TimelineStop";
import { Button } from "@/components/ui/button";
import { mapPlanStops } from "@/components/planning/mapStop";
import { usePlanStatusValidation } from "@/hooks/usePlanStatusValidation";
import { useRealtimePlanSync } from "@/hooks/useRealtimePlanSync";
import { usePlanPresence } from "@/hooks/usePlanPresence";
import { usePlanSummaries } from "@/hooks/usePlanSummaries";
import { useGeneratePlanSummary } from "@/hooks/usePlanSummaries";
import { useCollaborativeState } from "@/hooks/useCollaborativeState";
import { usePlan } from "@/hooks/usePlan";
import { usePlanStops } from "@/hooks/usePlanStops";
import { supabase } from "@/integrations/supabase/client";
import { getSafeStatus } from '@/lib/planStatusConfig';
import { SummaryModeEnum } from '@/types/enums/summaryMode';
import { toastError } from '@/lib/toast';
import { usePlanAutoProgression } from '@/hooks/usePlanAutoProgression';
import * as Collapsible from '@radix-ui/react-collapsible';

export const CollaborativePlanningScreen = () => {
  const { planId } = useParams<{ planId: string }>();
  
  const [planMode, setPlanMode] = useState<'planning' | 'executing'>('planning');
  const [showChat, setShowChat] = useState(false);
  const [venueSearchQuery, setVenueSearchQuery] = useState("");
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [currentUserRSVP, setCurrentUserRSVP] = useState<'attending' | 'maybe' | 'not_attending' | 'pending'>('pending');
  const [showExecutionOverlay, setShowExecutionOverlay] = useState(false);
  const [overlayAction, setOverlayAction] = useState<'vote' | 'rsvp' | 'check-in' | 'stop-action'>('vote');
  const [overlayFeedback, setOverlayFeedback] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [showSummaryEditModal, setShowSummaryEditModal] = useState(false);
  const [showNovaSuggestions, setShowNovaSuggestions] = useState(true);
  const [isNovaSuggestionsExpanded, setIsNovaSuggestionsExpanded] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isDragOperationPending, setIsDragOperationPending] = useState(false);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use the actual plan ID from URL params - throw error if missing
  if (!planId) {
    throw new Error('Plan ID is required but not provided in URL params');
  }


  const actualPlanId = planId;
  

  // ================================================================
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  // ================================================================
  
  // Fetch plan data
  const { data: plan, isLoading: isPlanLoading, error: planError } = usePlan(actualPlanId);
  
  // Get unified plan stops functionality
  const { 
    createStop, 
    deleteStop, 
    reorderStops,
    isCreating,
    isDeleting 
  } = useUnifiedPlanStops(actualPlanId);
  
  // Get stops data separately  
  const { data: stops = [], isLoading: isStopsLoading } = usePlanStops(actualPlanId);

  // Status validation for edit guards
  const { canEditPlan, canVoteOnStops } = usePlanStatusValidation()

  // Get haptic feedback hook
  const { socialHaptics: hapticFeedback } = useHapticFeedback()

  // Plan summaries (conditionally enabled)
  const { data: summaries } = usePlanSummaries(plan?.id || '');
  const generateSummary = useGeneratePlanSummary();

  // Real-time presence tracking (new simplified version)
  const { onlineUsers, totalOnline } = usePlanPresence(plan?.id || '');
  
  // Collaborative state for save indicator (conditionally enabled)
  const { saving } = useCollaborativeState({ planId: plan?.id || '', enabled: !!plan });

  // Auto-progression for plan completion (conditionally enabled)
  usePlanAutoProgression({
    planId: plan?.id || '',
    planStatus: plan?.status || 'draft',
    stops: stops || [],
    isCreator: plan?.creator_id === 'current-user',
    enabled: !!plan
  });

  // Real-time sync hook for live collaboration (conditionally enabled)
  const sync = useRealtimePlanSync({
    plan_id: plan?.id || '',
    enabled: !!plan,
    onParticipantJoined: (participant) => {
      console.log('Participant joined:', participant);
    },
    onParticipantLeft: (participant) => {
      console.log('Participant left:', participant);
    },
    onStopUpdated: (stop) => {
      console.log('Stop updated:', stop);
    }
  });

  // Overlay feedback helper with auto-dismiss
  const showOverlay = useCallback(
    (action: typeof overlayAction, feedback: string, ms = 2500) => {
      setOverlayAction(action);
      setOverlayFeedback(feedback);
      setShowExecutionOverlay(true);
      
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
      
      overlayTimeoutRef.current = setTimeout(() => {
        setShowExecutionOverlay(false);
        overlayTimeoutRef.current = null;
      }, ms);
    },
    []
  );

  // Advanced gestures
  const { controls: { startListening } } = useAdvancedGestures({
    onGesture: (gesture) => {
      switch (gesture.type) {
        case 'swipe-up':
          setShowNovaSuggestions(true);
          break;
        case 'swipe-down':
          setShowNovaSuggestions(false);
          break;
        case 'long-press':
          showOverlay('vote', 'Vote mode activated');
          break;
        default:
          break;
      }
    },
    enabled: true
  });

  // Keyboard shortcuts
  const { shortcuts } = useKeyboardShortcuts({
    onAddStop: () => plan && handleStopAdd("20:00"),
    onDeleteStop: () => {
      if (selectedStopIds.length > 0) {
        // TODO: Update to use unified system
        console.log('Legacy removeStop temporarily disabled');
        setSelectedStopIds([]);
      }
    },
    onExecutePlan: () => {}, // Handled by PlanStatusActions now
    onToggleChat: () => setShowChat(!showChat),
    onToggleSettings: () => console.log('Settings toggled'),
    onSavePlan: () => console.log('Plan saved'),
    onUndoAction: () => console.log('Undo'),
    onRedoAction: () => console.log('Redo'),
    onSearch: () => (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus(),
    onHelp: () => setShowKeyboardHelp(true)
  });

  // Effects
  useEffect(() => {
    if (startListening) {
      startListening();
    }
  }, [startListening]);

  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  // ================================================================
  // CONDITIONAL LOGIC (AFTER ALL HOOKS)
  // ================================================================
  
  // Show loading state while plan is loading
  if (isPlanLoading) {
    return <div className="flex items-center justify-center h-screen">Loading plan...</div>;
  }
  
  // Show error state if plan failed to load
  if (planError || !plan) {
    return <div className="flex items-center justify-center h-screen">Failed to load plan</div>;
  }

  // ================================================================
  // DERIVED STATE AND DATA
  // ================================================================
  
  const activities = []; // TODO: Get from plan activities hook
  const recentVotes = []; // TODO: Get from plan votes hook

  // Template functions - TODO: Update to use unified system
  const handleLoadTemplate = (templateStops: any[]) => {
    console.log('Template loading temporarily disabled - needs update to unified system')
    // TODO: Update to use createStop.mutateAsync for each stop
  }


  const handleStopAdd = (timeSlot: string) => {
    // Check if plan can be edited - normalize status with fallback
    const normalizedStatus = getSafeStatus(plan.status)
    if (!canEditPlan(normalizedStatus)) {
      toastError('Action blocked', 'This plan cannot be edited in its current status.');
      return;
    }

    hapticFeedback.gestureConfirm();
    const newStop = {
      id: uuidv4(),
      title: "New Stop",
      venue: "TBD",
      description: "Add details",
      startTime: timeSlot,
      endTime: "22:00",
      start_time: timeSlot,
      end_time: "22:00",
      location: "TBD",
      vibeMatch: 50,
      status: 'suggested' as const,
      color: "hsl(200 70% 60%)",
      kind: 'restaurant' as any,
      createdBy: 'current-user',
      participants: [],
      votes: []
    };
    // TODO: Update to use unified system
    console.log('Legacy addStop temporarily disabled');
    showOverlay('stop-action', 'Stop creation temporarily disabled');
  };

  const handleStopReorderByIndex = async (stopId: string, newIndex: number) => {
    // Check if plan can be edited - normalize status with fallback
    const normalizedStatus = getSafeStatus(plan.status)
    if (!canEditPlan(normalizedStatus)) {
      toastError('Action blocked', 'This plan cannot be edited in its current status.');
      return;
    }

    setIsDragOperationPending(true);
    try {
      const stopIndex = stops.findIndex(s => s.id === stopId);
      
      if (stopIndex !== -1) {
        await reorderStops(stopIndex, newIndex);
      }
      
      showOverlay('stop-action', 'Timeline updated');
    } finally {
      setIsDragOperationPending(false);
    }
  };

  const handleStopSelect = (stopId: string) => {
    setSelectedStopIds(prev => 
      prev.includes(stopId) 
        ? prev.filter(id => id !== stopId)
        : [...prev, stopId]
    );
  };

  // Drag and drop handler with correct signature
  const handleStopReorder = (activeId: string, overId: string) => {
    const stopsArray = stops || []
    const overIndex = stopsArray.findIndex(stop => stop.id === overId)
    if (overIndex !== -1) {
      handleStopReorderByIndex(activeId, overIndex)
    }
  };

  // Mock collaboration state for now - plan.participants doesn't exist in DB schema
  const collaborationParticipants = [];
  const connectionStatus = 'connected';
  const isOptimistic = false;

  // Duplicate hooks removed - already declared at the top
  
  const isConnected = sync.isConnected;
  const activeParticipants = [];
  const syncedPlanMode = planMode;

  // Memoize mapped data to prevent infinite re-renders (placed after hooks)
  const mappedStops = useMemo(() => 
    stops.map(stop => ({
      id: stop.id,
      title: stop.title,
      venue: stop.venue,
      startTime: stop.startTime,
      endTime: stop.endTime,
      estimatedCost: 25,
      votes: { positive: 8, negative: 1, total: 9 },
      status: stop.status === 'confirmed' ? 'confirmed' : 'pending'
    })), [stops]
  );

  const mappedParticipants = useMemo(() => 
    activeParticipants.length > 0 
      ? activeParticipants.map(p => ({ 
          id: p.user_id, 
          name: p.profiles?.display_name || p.profiles?.username || 'Unknown', 
          rsvpStatus: p.rsvp_status || 'pending' 
        }))
      : collaborationParticipants.map(p => ({ id: p.id, name: p.name, rsvpStatus: currentUserRSVP }))
  , [activeParticipants, collaborationParticipants, currentUserRSVP]);

  const participantUpdates = useMemo(() => {
    const baseTimestamp = Date.now();
    return collaborationParticipants.map((p, index) => ({
      id: p.id,
      username: p.name,
      avatar: p.avatar,
      action: 'joined' as const,
      timestamp: baseTimestamp + index, // Slight offset to avoid duplicate timestamps
    }));
  }, [collaborationParticipants]);

  const selectedVenues = useMemo(() => 
    stops.map(s => s.venue), [stops]
  );

  const executionStops = useMemo(() => 
    stops.map(stop => ({
      id: stop.id,
      title: stop.title,
      venue: stop.venue,
      startTime: stop.startTime,
      endTime: stop.endTime || stop.startTime,
      location: stop.location || '',
      participants: [],
      status: 'upcoming' as const
    })), [stops]
  );

  // Convert stops to TimelineStop format for new timeline canvas
  const timelineStops = useMemo((): TimelineStop[] => 
    stops.map(stop => {
      const startTime = stop.startTime || '18:00';
      const endTime = stop.endTime || '19:00';
      const durationMin = calculateDurationMinutes(startTime, endTime);
      
      return {
        id: stop.id,
        title: stop.title,
        venueName: stop.venue,
        start: startTime,
        end: endTime,
        durationMin,
        color: getStopColor(stop),
        conflicts: detectConflicts(stop, stops),
        travel: calculateTravelTime(stop, stops)
      };
    }), [stops]
  );

  // Helper functions for timeline conversion
  const calculateDurationMinutes = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    return Math.max(30, endMin - startMin); // Minimum 30 minutes
  };

  const getStopColor = (stop: any): string => {
    if (stop.status === 'confirmed') return 'from-green-500 to-emerald-500';
    if (stop.status === 'suggested') return 'from-blue-500 to-indigo-500';
    if (stop.kind === 'restaurant') return 'from-orange-500 to-red-500';
    if (stop.kind === 'entertainment') return 'from-purple-500 to-pink-500';
    return 'from-indigo-500 to-violet-500';
  };

  const detectConflicts = (stop: any, allStops: any[]): string[] => {
    const conflicts: string[] = [];
    
    // Check for time overlaps
    const hasOverlap = allStops.some(other => 
      other.id !== stop.id && 
      stop.startTime < other.endTime && 
      other.startTime < stop.endTime
    );
    
    if (hasOverlap) conflicts.push('overlap');
    
    // Mock venue hours check
    const hour = parseInt(stop.startTime?.split(':')[0] || '18');
    if (hour < 10 || hour > 23) conflicts.push('closed');
    
    return conflicts;
  };

  const calculateTravelTime = (stop: any, allStops: any[]): TimelineStop['travel'] => {
    const stopIndex = allStops.findIndex(s => s.id === stop.id);
    if (stopIndex <= 0) return undefined;
    
    // Mock travel time calculation
    return {
      fromPrevWalkMin: Math.floor(Math.random() * 15) + 5, // 5-20 min
      fromPrevDriveMin: Math.floor(Math.random() * 10) + 3  // 3-13 min
    };
  };

  const handleAcceptSuggestion = async (s: any) => {
    const newStop = {
      id: uuidv4(),
      title: s.title,
      venue: s.venue ?? 'TBD',
      description: `AI suggested: ${s.reasons?.[0]?.description ?? ''}`,
      startTime: s.startTime,
      endTime: s.endTime,
      start_time: s.startTime,
      end_time: s.endTime,
      location: s.location ?? 'TBD',
      vibeMatch: s.vibeMatch,
      status: 'suggested' as const,
      color: 'hsl(280 70% 60%)',
      kind: 'restaurant' as any,
      createdBy: 'current-user',
      participants: [],
      votes: []
    };

    // TODO: Update to use unified system
    console.log('Legacy AI addStop temporarily disabled');
    showOverlay('stop-action', 'AI suggestion temporarily disabled');
  };

  // Enhanced RSVP handler with persistence
  const handleRSVPChange = async (status: typeof currentUserRSVP) => {
    setCurrentUserRSVP(status);
    
    // Persist RSVP to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Note: In production, this would update the participant's RSVP status
        console.log('RSVP updated:', status);
        showOverlay('rsvp', `RSVP: ${status}`);
      }
    } catch (error) {
      console.error('Failed to persist RSVP:', error);
    }
  };

  // Duplicate hooks and effects removed - already declared at the top

  const handleVenueSelect = (venue: any) => {
    // Check if plan can be edited - normalize status with fallback
    const normalizedStatus = getSafeStatus(plan.status)
    if (!canEditPlan(normalizedStatus)) {
      toastError('Action blocked', 'This plan cannot be edited in its current status.');
      return;
    }

    hapticFeedback.gestureConfirm();
    const newStop = {
      id: uuidv4(),
      title: `${venue.type} at ${venue.name}`,
      venue: venue.name,
      description: venue.description,
      startTime: "20:00",
      endTime: "22:00",
      start_time: "20:00",
      end_time: "22:00",
      location: venue.location,
      vibeMatch: venue.vibeMatch,
      status: 'suggested' as const,
      color: venue.color,
      kind: 'restaurant' as any,
      createdBy: 'current-user',
      participants: [],
      votes: []
    };
    // TODO: Update to use unified system
    console.log('Legacy venue addStop temporarily disabled');
    showOverlay('stop-action', 'Venue stop temporarily disabled');
  };

  // New Timeline Canvas handlers
  const handleTimelineReorder = useCallback((reorderedStops: TimelineStop[]) => {
    // Convert back to original stop format and update
    const reorderedIds = reorderedStops.map(s => s.id);
    const newStops = reorderedIds.map(id => stops.find(s => s.id === id)).filter(Boolean);
    
    // Use the existing reorder mutation
    const reorderedWithNewOrder = newStops.map((stop, index) => ({
      ...stop,
      stop_order: index + 1
    }));
    
    // Update via unified hook
    reorderedWithNewOrder.forEach((stop, index) => {
      if (index !== stops.findIndex(s => s.id === stop.id)) {
        // Only update if order actually changed
        updateStop.mutate({
          stopId: stop.id,
          updates: { stop_order: index + 1 }
        });
      }
    });
    
    showOverlay('stop-action', 'Timeline reordered');
  }, [stops, updateStop, showOverlay]);

  const handleTimelineAddAt = useCallback((hhmm: string) => {
    // Use existing handleStopAdd with the specific time
    handleStopAdd(hhmm);
  }, [handleStopAdd]);

  const handleSendChatMessage = (content: string, type = 'message') => {
    // In a real app, this would send to Supabase
    const newMessage = {
      id: Date.now().toString(),
      profileId: 'current-user',
      userName: 'You',
      userAvatar: '',
      content,
      timestamp: new Date(),
      type
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  // Toggle: 'glass' | 'neu' | null (keep null to stick with your current dark look)
  const PLANNING_THEME: 'glass' | 'neu' | null = 'glass';

  // Compute derived UI values with defensive guards
  const readiness = useMemo(() => {
    if (!stops.length) return 5;
    const confirmedStops = stops.filter(s => s.status === 'confirmed').length;
    return Math.min(100, Math.round((confirmedStops / stops.length) * 40 + (collaborationParticipants.length || 1) * 10));
  }, [stops, collaborationParticipants]);

  const dateLabel = useMemo(() => {
    return plan?.date ? new Date(plan.date).toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }) : 'Date TBD';
  }, [plan?.date]);

  const timeLabel = `${plan?.start_time ?? '18:00'} – ${plan?.end_time ?? '00:00'}`;
  const durationLabel = plan?.duration_hours ? `${plan.duration_hours}h` : '—';

  // Prepare mapped stops for new timeline components
  const mappedTimelineStops = useMemo(() => mapPlanStops(stops), [stops]);

  return (
    <div 
      className={[
        'min-h-screen bg-gradient-field pb-24 sm:pb-6',
        PLANNING_THEME === 'glass' ? 'planning-glass' : '',
        PLANNING_THEME === 'neu' ? 'planning-neu' : '',
      ].join(' ')}
    >
      {/* Execution Overlay */}
      <ExecutionOverlay
        isVisible={showExecutionOverlay}
        action={overlayAction}
        feedback={overlayFeedback}
        onComplete={() => setShowExecutionOverlay(false)}
      />

      {/* Chat will be integrated with existing PlanningChat */}

      {/* Keyboard Shortcut Help */}
      <KeyboardShortcutHelp
        shortcuts={shortcuts}
        isVisible={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Social Pulse Overlay - Temporarily disabled to prevent infinite re-renders */}
      {/* {planMode === 'planning' && <SocialPulseOverlay />} */}

      {/* Hero Header */}
      <div className="p-4 sm:p-6 pt-16 space-y-6">
        <PlanHero
          title={plan?.title ?? 'Untitled plan'}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          durationLabel={durationLabel}
          participants={collaborationParticipants.map(p => ({ avatar: p.avatar }))}
          readinessPct={readiness}
          status={getSafeStatus(plan?.status) || 'Draft'}
          variant={PLANNING_THEME || 'darkGlass'}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiChip 
            icon={<Clock className="h-4 w-4"/>} 
            label="Duration" 
            value={durationLabel}
            variant={PLANNING_THEME || 'darkGlass'}
          />
          <KpiChip 
            icon={<DollarSign className="h-4 w-4"/>} 
            label="Per person" 
            value={plan?.budget_per_person ? `$${plan.budget_per_person}` : '—'}
            variant={PLANNING_THEME || 'darkGlass'}
          />
          <KpiChip 
            icon={<Users className="h-4 w-4"/>} 
            label="Going" 
            value={(collaborationParticipants?.length ?? 0).toString()}
            variant={PLANNING_THEME || 'darkGlass'}
          />
          <KpiChip 
            icon={<Calendar className="h-4 w-4"/>} 
            label="Stops" 
            value={`${stops.length}`} 
            hint={`${readiness}% ready`}
            variant={PLANNING_THEME || 'darkGlass'}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-3 gap-3">
          <Button className="h-12 rounded-2xl btn-primary">Edit Timeline</Button>
          <Button variant="secondary" className="h-12 rounded-2xl btn-secondary">
            <Share2 className="mr-2 h-4 w-4"/>Share Plan
          </Button>
          <Button variant="secondary" className="h-12 rounded-2xl btn-secondary" onClick={() => setShowChat(!showChat)}>
            <MessageCircle className="mr-2 h-4 w-4"/>Group Chat
          </Button>
        </div>

        {/* AI Suggestions */}
        <section className="card rounded-2xl p-3 sm:p-4">
          <NovaSuggestions
            planId={plan.id}
            existingStops={stops}
            timeRange={{ start: "18:00", end: "23:59" }}
            participants={collaborationParticipants.length}
            preferences={{
              budget: 'medium',
              vibes: ['energetic', 'social'],
              interests: ['dining', 'nightlife']
            }}
            onAcceptSuggestion={handleAcceptSuggestion}
            onDismiss={() => setShowNovaSuggestions(false)}
          />
        </section>

        {/* Timeline */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <Button className="rounded-2xl" onClick={() => handleStopAdd('20:00')}>
              <Plus className="h-4 w-4 mr-2"/> Add Stop
            </Button>
          </div>
          {stops.length === 0 ? (
            <div className="card rounded-3xl border border-white/10 bg-white/4 backdrop-blur-xl py-12 text-center">
              <div className="text-2xl mb-2">No stops yet</div>
              <div className="opacity-70 mb-4 text-sm">Tap "Add Stop" or let Nova suggest a timeline.</div>
              <Button variant="secondary" onClick={() => setShowNovaSuggestions(true)}>Get AI Suggestions</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {stops.map((stop: any) => (
                <TimelineStop 
                  key={stop.id} 
                  stop={stop} 
                  onEdit={(s) => console.log('Edit stop:', s)}
                  onDelete={(s) => console.log('Delete stop:', s)}
                  variant={PLANNING_THEME || 'darkGlass'}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Live tracker at bottom for Active plans */}
      {plan?.status === 'active' && (
        <div className="fixed bottom-0 inset-x-0">
          <div className="bg-card/90 backdrop-blur-xl border-t border-border/30 p-4">
            <div className="max-w-5xl mx-auto">
              <LiveParticipantTracker updates={participantUpdates} />
            </div>
          </div>
        </div>
      )}

      {/* Modals and overlays */}
      {showSummaryEditModal && (
        <PlanSummaryEditModal
          planId={plan.id}
          currentSummary=""
          onSave={(summary) => {
            console.log('Save summary:', summary);
            setShowSummaryEditModal(false);
          }}
          onClose={() => setShowSummaryEditModal(false)}
        />
      )}
    </div>
  );
};
