import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Settings, Play, Users, MessageCircle, HelpCircle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useParams } from 'react-router-dom';
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutHelp } from "@/components/ui/keyboard-shortcut-help";
import { MobileTimelineGrid } from "@/components/planning/MobileTimelineGrid";
import { PlanInviteButton } from "@/components/PlanInviteButton";
import { CheckInStatusBadge } from "@/components/CheckInStatusBadge";
import { TimeProgressBar } from "@/components/TimeProgressBar";
import { useLegacyCollaborativeState } from "@/hooks/useLegacyCollaborativeState";
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
import { PlanSummaryEditModal } from "@/components/plan/PlanSummaryEditModal";
import { PlanStatusBadge } from "@/components/plans/PlanStatusBadge";
import { PlanStatusActions } from "@/components/plans/PlanStatusActions";
import { usePlanStatusValidation } from "@/hooks/usePlanStatusValidation";
import { usePlanRealTimeSync } from "@/hooks/usePlanRealTimeSync";
import { usePlanPresence } from "@/hooks/usePlanPresence";
import { usePlanSummaries } from "@/hooks/usePlanSummaries";
import { useGeneratePlanSummary } from "@/hooks/usePlanSummaries";
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
  

  // Get collaborative state including all functions
  const {
    stops,
    isLoading,
    removeStop,
    reorderStops,
    addStop,
    voteOnStop
  } = useLegacyCollaborativeState(actualPlanId);

  // Mock the remaining properties that need real implementation
  const plan = { 
    id: actualPlanId,
    title: 'Collaborative Plan',
    date: new Date().toISOString().split('T')[0],
    stops, 
    status: 'draft' as const,
    participants: [], // TODO: Get from usePlanRoom
    creator_id: 'current-user'
  };
  const activities = []; // TODO: Get from plan activities hook
  const updateParticipantStatus = () => {};
  const recentVotes = []; // TODO: Get from plan votes hook

  // Status validation for edit guards
  const { canEditPlan, canVoteOnStops } = usePlanStatusValidation()

  // Get haptic feedback hook
  const { socialHaptics: hapticFeedback } = useHapticFeedback()

  // Template functions
  const handleLoadTemplate = (templateStops: any[]) => {
    // Generate new IDs using uuid and add to current plan
    const { v4: uuidv4 } = require('uuid')
    const newStops = templateStops.map((stop, index) => ({
      ...stop,
      id: uuidv4(),
      participants: [],
      created_by: 'current-user'
    }))
    
    newStops.forEach(stop => {
      addStop(stop)
    })
  }


  const handleStopAdd = (timeSlot: string) => {
    // Check if plan can be edited - normalize status with fallback
    const normalizedStatus = getSafeStatus(plan.status)
    if (!canEditPlan(normalizedStatus)) {
      toastError('Action blocked', 'This plan cannot be edited in its current status.');
      return;
    }

    hapticFeedback.gestureConfirm();
    const { v4: uuidv4 } = require('uuid')
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
    addStop(newStop);
    showOverlay('stop-action', 'Stop created!');
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
      const stopIndex = plan.stops.findIndex(s => s.id === stopId);
      
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

  // Keyboard shortcuts
  const { shortcuts } = useKeyboardShortcuts({
    onAddStop: () => handleStopAdd("20:00"),
    onDeleteStop: () => {
      if (selectedStopIds.length > 0) {
        selectedStopIds.forEach(stopId => removeStop(stopId));
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

  // Mock collaboration state for now
  const collaborationParticipants = plan.participants;
  const connectionStatus = 'connected';
  const isOptimistic = false;

  // Plan summaries
  const { data: summaries } = usePlanSummaries(plan.id);
  const generateSummary = useGeneratePlanSummary();

  // Real-time presence tracking
  const { participants: presenceParticipants, updateActivity } = usePlanPresence(plan.id);

  // Auto-progression for plan completion
  usePlanAutoProgression({
    planId: plan.id,
    planStatus: plan.status || 'draft',
    stops: plan.stops,
    isCreator: plan.creator_id === 'current-user',
    enabled: true
  });

  // Real-time sync hook for live collaboration
  const { isConnected, participantCount, planMode: syncedPlanMode, activeParticipants, updatePlanMode } = usePlanRealTimeSync(plan.id, {
    onParticipantJoin: (participant) => {
      console.log('Participant joined:', participant);
    },
    onVoteUpdate: (voteData) => {
      console.log('Vote update:', voteData);
      showOverlay('vote', 'Vote submitted ✓');
    },
    onStopUpdate: (stopData) => {
      console.log('Stop update:', stopData);
    },
    onChatMessage: (message) => {
      console.log('New chat message:', message);
      setChatMessages(prev => [...prev, {
        id: message.id,
        userId: message.user_id,
        userName: 'User', // Would come from profiles join
        userAvatar: '',
        content: message.content,
        timestamp: new Date(message.created_at),
        type: 'message'
      }]);
    },
    onRSVPUpdate: (rsvpData) => {
      console.log('RSVP update:', rsvpData);
      showOverlay('rsvp', 'RSVP updated!');
    },
    onPlanModeChange: (mode) => {
      setPlanMode(mode);
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
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleAcceptSuggestion = async (s: any) => {
    const { v4: uuidv4 } = require('uuid')
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

    await addStop(newStop);
    showOverlay('stop-action', 'AI suggestion added!');
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

  // Use the already declared hapticFeedback instead of duplicating

  const { controls: { startListening } } = useAdvancedGestures({
    onGesture: (gesture) => {
      switch (gesture.type) {
        case 'shake':
          hapticFeedback.shakeActivated();
          // Add random venue suggestion on shake
          break;
        case 'swipe-left':
          if (showChat) setShowChat(false);
          break;
        case 'swipe-right': 
          if (!showChat) setShowChat(true);
          break;
        case 'long-press':
          hapticFeedback.longPressActivated();
          // Show context menu for long press
          break;
      }
    }
  });

  // Start gesture listening on mount
  useEffect(() => {
    startListening();
  }, [startListening]);

  // Cleanup overlay timeout on unmount
  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  const handleVenueSelect = (venue: any) => {
    // Check if plan can be edited - normalize status with fallback
    const normalizedStatus = getSafeStatus(plan.status)
    if (!canEditPlan(normalizedStatus)) {
      toastError('Action blocked', 'This plan cannot be edited in its current status.');
      return;
    }

    hapticFeedback.gestureConfirm();
    const { v4: uuidv4 } = require('uuid')
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
    addStop(newStop);
    showOverlay('stop-action', 'Stop added!');
  };


  const handleSendChatMessage = (content: string, type = 'message') => {
    // In a real app, this would send to Supabase
    const newMessage = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'You',
      userAvatar: '',
      content,
      timestamp: new Date(),
      type
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="min-h-screen bg-gradient-field pb-24 sm:pb-6">
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

      {/* Social Pulse Overlay */}
      {planMode === 'planning' && <SocialPulseOverlay />}

      {/* Header */}
      <div className="p-4 sm:p-6 pt-16">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                {plan.title}
              </h1>
              <PlanStatusBadge 
                status={getSafeStatus(plan.status)} 
                size="default"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <span>{plan.date}</span>
              <span className="hidden sm:inline">•</span>
              <PlanPresenceIndicator
                participants={plan.participants}
                isConnected={isConnected}
              />
              <span className="hidden sm:inline">•</span>
              <span className="capitalize text-primary">{syncedPlanMode || planMode}</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Status transition buttons - prominent for major actions */}
            <PlanStatusActions 
              planId={plan.id}
              currentStatus={getSafeStatus(plan.status)}
              isCreator={plan.creator_id === 'current-user'} // This would come from auth
              hasStops={plan.stops.length > 0}
              hasParticipants={plan.participants.length > 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-3 py-2"
            />
            
            <PlanInviteButton />
            <SharePlanButton 
              planId={plan.id}
              planTitle={plan.title}
              variant="ghost"
              size="sm"
            />
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-xl transition-all duration-300 ${
                showChat ? 'bg-primary text-primary-foreground glow-primary' : 'bg-card/50 text-muted-foreground hover:bg-card/80'
              }`}
              title="Toggle chat"
            >
              <MessageCircle size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button 
              onClick={() => setShowKeyboardHelp(true)}
              className="hidden sm:flex p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300"
              title="Keyboard shortcuts (?)"
            >
              <HelpCircle size={20} className="text-muted-foreground" />
            </button>
            <button className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300">
              <Settings size={18} className="sm:w-5 sm:h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Time Progress Bar */}
        <TimeProgressBar
          planStartTime={new Date(plan.date)}
          planDuration={240} // 4 hours in minutes
          className="mb-6"
        />

        {/* Live Participant Tracker */}
        <LiveParticipantTracker 
          updates={plan.participants.map(p => ({
            id: p.id,
            username: p.name,
            avatar: p.avatar,
            action: 'joined' as const,
            timestamp: Date.now(),
          }))}
        />

        {/* RSVP Card */}
        <RSVPCard
          planId={plan.id}
          planTitle={plan.title}
          planDate={plan.date}
          currentUserRSVP={currentUserRSVP}
          attendeeCount={3} // Mock data - would come from real RSVP data
          maybeCount={1} // Mock data - would come from real RSVP data
          onRSVPChange={handleRSVPChange}
          hasConflict={plan.stops.some(stop => plan.stops.some(other => 
            stop.id !== other.id && 
            stop.startTime < other.endTime && 
            other.startTime < stop.endTime
          ))}
          className="mb-6"
        />

        {/* Nova AI Suggestions - Moved from sidebar to main flow */}
        {showNovaSuggestions && (
          <Collapsible.Root
            open={isNovaSuggestionsExpanded}
            onOpenChange={setIsNovaSuggestionsExpanded}
            className="mb-4"
          >
            <Collapsible.Trigger asChild>
              <button className="w-full flex items-center justify-between rounded-xl
                                 bg-card/70 px-4 py-3 hover:bg-card/60 transition">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-medium">Nova AI Suggestions</span>
                </span>
                {isNovaSuggestionsExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </Collapsible.Trigger>

            <Collapsible.Content className="pt-3">
              {isNovaSuggestionsExpanded && (
                <NovaSuggestions
                  planId={plan.id}
                  existingStops={plan.stops}
                  timeRange={{ start: "18:00", end: "23:59" }}
                  participants={plan.participants.length}
                  preferences={{
                    budget: 'medium',
                    vibes: ['energetic', 'social'],
                    interests: ['dining', 'nightlife']
                  }}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onDismiss={() => setShowNovaSuggestions(false)}
                />
              )}
            </Collapsible.Content>
          </Collapsible.Root>
        )}

        {/* Voting Threshold Meter - Only show for finalized+ plans */}
        {canVoteOnStops(getSafeStatus(plan.status)) && (
          <VotingThresholdMeter
            totalParticipants={activeParticipants.length || plan.participants.length}
            votedParticipants={Math.floor((activeParticipants.length || plan.participants.length) * 0.7)} // Mock 70% participation
            threshold={60}
            className="mb-6"
          />
        )}

        {planMode === 'planning' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Timeline Editor & Summary */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              
              <MobileTimelineGrid
                planId={plan.id}
                planStatus={plan.status}
                startTime="18:00"
                endTime="23:59"
                stops={stops}
                onStopReorder={handleStopReorder}
                onStopSelect={handleStopSelect}
                onAddStop={handleStopAdd}
              />

              {/* Plan Summary Card - Finalized Mode */}
              <PlanSummaryCard
                planId={plan.id}
                mode={SummaryModeEnum.enum.finalized}
                editable={true}
                title="Plan Summary"
              />

              {/* Summary Review Panel */}
              <SummaryReviewPanel
                planTitle={plan.title}
                planDate={plan.date}
                stops={plan.stops.map(stop => ({
                  id: stop.id,
                  title: stop.title,
                  venue: stop.venue,
                  startTime: stop.startTime,
                  endTime: stop.endTime,
                  estimatedCost: 25,
                  votes: { positive: 8, negative: 1, total: 9 },
                  status: stop.status === 'confirmed' ? 'confirmed' : 'pending'
                }))}
                participants={activeParticipants.length > 0 
                  ? activeParticipants.map(p => ({ 
                      id: p.user_id, 
                      name: p.profiles?.display_name || p.profiles?.username || 'Unknown', 
                      rsvpStatus: p.rsvp_status || 'pending' 
                    }))
                  : plan.participants.map(p => ({ id: p.id, name: p.name, rsvpStatus: currentUserRSVP }))
                }
                totalBudget={150}
                onFinalize={() => showOverlay('check-in', 'Plan finalized!')}
                onEdit={(stopId) => console.log('Edit stop:', stopId)}
              />

              {/* Tiebreaker Suggestions */}
              {showTiebreaker && (
                <TiebreakerSuggestions
                  stopId="current-stop"
                  tiedOptions={["Option A", "Option B"]}
                  onSelectRecommendation={(rec) => {
                    console.log('AI recommends:', rec);
                    setShowTiebreaker(false);
                    showOverlay('vote', 'Tiebreaker applied!');
                  }}
                  className="mb-6"
                />
              )}
              
            </div>

            {/* Right Column - Mobile-optimized */}
            <div className="space-y-4 sm:space-y-6">
              {/* Venue Search - Hidden on mobile */}
              <div className="hidden md:block bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30">
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={venueSearchQuery}
                    onChange={(e) => setVenueSearchQuery(e.target.value)}
                    placeholder="Search venues..."
                    className="w-full bg-background/50 border border-border/30 rounded-2xl py-3 px-4 pr-12 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                  />
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                
                <VenueCardLibrary
                  onVenueSelect={handleVenueSelect}
                  selectedVenues={plan.stops.map(s => s.venue)}
                  searchQuery={venueSearchQuery}
                />
              </div>

              {/* Plan Templates */}
              <PlanTemplatesPanel
                currentPlan={plan}
                onLoadTemplate={handleLoadTemplate}
                className="mb-4"
              />

              {/* Planning Chat */}
              {showChat && (
                <PlanningChat planId={plan.id} currentUserId="you" />
              )}
            </div>
          </div>
        ) : (
          /* Plan Execution Mode */
          <div>
            <PlanExecutionTracker
              stops={plan.stops.map(stop => ({
                id: stop.id,
                title: stop.title,
                venue: stop.venue,
                startTime: stop.startTime,
                endTime: stop.endTime || stop.startTime,
                location: stop.location || '',
                participants: [],
                status: 'upcoming' as const
              }))}
              currentTime="19:30"
              groupLocation="Arts District"
            />
          </div>
        )}
      </div>

      {/* Summary Edit Modal */}
      {showSummaryEditModal && (
        <PlanSummaryEditModal
          planId={plan.id}
          mode={SummaryModeEnum.enum.finalized}
          onClose={() => setShowSummaryEditModal(false)}
        />
      )}
    </div>
  );
};