import { useState } from "react";
import { Search, Settings, Play, Users, MessageCircle } from "lucide-react";
import { useCollaborativeState } from "@/hooks/useCollaborativeState";
import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { LiveParticipantTracker } from "@/components/LiveParticipantTracker";
import { VenueCardLibrary } from "@/components/VenueCardLibrary";
import { TimelineEditor } from "@/components/TimelineEditor";
import { PlanningChat } from "@/components/PlanningChat";
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
import { usePlanRealTimeSync } from "@/hooks/usePlanRealTimeSync";
import { supabase } from "@/integrations/supabase/client";

export const CollaborativePlanningScreen = () => {
  const [planMode, setPlanMode] = useState<'planning' | 'executing'>('planning');
  const [showChat, setShowChat] = useState(false);
  const [venueSearchQuery, setVenueSearchQuery] = useState("");
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [currentUserRSVP, setCurrentUserRSVP] = useState<'attending' | 'maybe' | 'not_attending' | 'pending'>('pending');
  const [showExecutionOverlay, setShowExecutionOverlay] = useState(false);
  const [overlayAction, setOverlayAction] = useState<'vote' | 'rsvp' | 'check-in' | 'stop-action'>('vote');
  const [overlayFeedback, setOverlayFeedback] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  
  const {
    plan,
    activities,
    addStop,
    removeStop,
    reorderStops,
    voteOnStop,
    updateParticipantStatus
  } = useCollaborativeState("plan-1");

  // Real-time sync hook for live collaboration
  const { isConnected, participantCount, planMode: syncedPlanMode, updatePlanMode } = usePlanRealTimeSync(plan.id, {
    onParticipantJoin: (participant) => {
      console.log('Participant joined:', participant);
    },
    onVoteUpdate: (voteData) => {
      console.log('Vote update:', voteData);
      showOverlay('vote', 'Vote recorded!');
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

  // Overlay feedback helper
  const showOverlay = (action: typeof overlayAction, feedback: string) => {
    setOverlayAction(action);
    setOverlayFeedback(feedback);
    setShowExecutionOverlay(true);
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

  const { socialHaptics } = useHapticFeedback();

  const { controls: { startListening } } = useAdvancedGestures({
    onGesture: (gesture) => {
      switch (gesture.type) {
        case 'shake':
          socialHaptics.shakeActivated();
          // Add random venue suggestion on shake
          break;
        case 'swipe-left':
          if (showChat) setShowChat(false);
          break;
        case 'swipe-right': 
          if (!showChat) setShowChat(true);
          break;
        case 'long-press':
          socialHaptics.longPressActivated();
          // Show context menu for long press
          break;
      }
    }
  });

  // Start gesture listening on mount
  useState(() => {
    startListening();
  });

  const handleVenueSelect = (venue: any) => {
    socialHaptics.gestureConfirm();
    const newStop = {
      title: `${venue.type} at ${venue.name}`,
      venue: venue.name,
      description: venue.description,
      startTime: "20:00", // Default time, user can adjust
      endTime: "22:00",
      location: venue.location,
      vibeMatch: venue.vibeMatch,
      status: 'suggested' as const,
      color: venue.color
    };
    addStop(newStop);
    showOverlay('stop-action', 'Stop added!');
  };

  const handleStopAdd = (timeSlot: string) => {
    socialHaptics.gestureConfirm();
    const newStop = {
      title: "New Stop",
      venue: "TBD",
      description: "Add details",
      startTime: timeSlot,
      endTime: "22:00", // Default 2 hour duration
      location: "TBD",
      vibeMatch: 50,
      status: 'suggested' as const,
      color: "hsl(200 70% 60%)"
    };
    addStop(newStop);
    showOverlay('stop-action', 'Stop created!');
  };

  const handleExecutePlan = async () => {
    socialHaptics.vibeMatch();
    await updatePlanMode('executing');
    showOverlay('check-in', 'Plan execution started!');
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
    <div className="min-h-screen bg-gradient-field pb-24">
      {/* Execution Overlay */}
      <ExecutionOverlay
        isVisible={showExecutionOverlay}
        action={overlayAction}
        feedback={overlayFeedback}
        onComplete={() => setShowExecutionOverlay(false)}
      />

      {/* Chat will be integrated with existing PlanningChat */}

      {/* Social Pulse Overlay */}
      <SocialPulseOverlay isPlanning={planMode === 'planning'} currentPlan={plan} />

      {/* Header */}
      <div className="p-6 pt-16">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {plan.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
              <span>{plan.date}</span>
              <span>•</span>
              <PlanPresenceIndicator
                participants={plan.participants}
                isConnected={isConnected}
              />
              <span>•</span>
              <span className="capitalize text-primary">{syncedPlanMode || planMode}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
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
            >
              <MessageCircle size={20} />
            </button>
            <button className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300">
              <Settings size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Live Participant Tracker */}
        <LiveParticipantTracker 
          participants={plan.participants}
          onParticipantUpdate={updateParticipantStatus}
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
          className="mb-6"
        />

        {/* Voting Threshold Meter */}
        <VotingThresholdMeter
          totalParticipants={plan.participants.length}
          votedParticipants={Math.floor(plan.participants.length * 0.7)} // Mock 70% participation
          threshold={60}
          className="mb-6"
        />

        {planMode === 'planning' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Timeline Editor & Summary */}
            <div className="lg:col-span-2 space-y-6">
              <TimelineEditor
                planId={plan.id}
                isEditable={true}
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
                participants={plan.participants.map(p => ({ id: p.id, name: p.name, rsvpStatus: 'pending' }))}
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
              
              {/* Execute Plan Button */}
              {plan.stops.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={handleExecutePlan}
                    className="bg-gradient-primary text-primary-foreground px-8 py-4 rounded-3xl font-semibold text-lg transition-all duration-300 hover:scale-105 glow-primary flex items-center space-x-2 mx-auto"
                  >
                    <Play className="w-5 h-5" />
                    <span>Execute Plan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Venue Library & Chat */}
            <div className="space-y-6">
              {/* Venue Search */}
              <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30">
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
                ...stop,
                status: 'upcoming' as const // This would be calculated based on real time
              }))}
              currentTime="19:30"
              groupLocation="Arts District"
            />
          </div>
        )}
      </div>
    </div>
  );
};