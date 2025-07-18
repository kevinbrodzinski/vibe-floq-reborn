import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, Brain, Mail, RotateCcw, Heart, BookOpen, Sparkles, Users, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCrossedPathsToday } from "@/hooks/useCrossedPathsToday";
import { CrossedPathsCard } from "@/components/CrossedPathsCard";
import { useRealtimeAfterglowData } from "@/hooks/useRealtimeAfterglowData";
import { AfterglowCard } from "@/components/AfterglowCard";
import { AfterglowMomentCard } from "@/components/AfterglowMomentCard";
import { AfterglowGenerationProgress } from "@/components/AfterglowGenerationProgress";
import { getVibeDisplayName } from "@/utils/afterglowHelpers";
import { useTogglePinned } from "@/hooks/useOptimisticMutations";
import AfterglowCalendarDialog from "@/components/afterglow/AfterglowCalendarDialog";
import AfterglowInsightsModal from "@/components/afterglow/AfterglowInsightsModal";
import { EnhancedTimeline } from "@/components/afterglow/EnhancedTimeline";
import { MomentDetailDrawer } from "@/components/drawer/MomentDetailDrawer";
import { Suspense } from 'react';
import { Link } from "react-router-dom";
import { ParticleField } from '@/components/visual/ParticleField';
import { useAmbientBackground } from '@/hooks/useAmbientBackground';
import { triggerHaptic } from '@/utils/haptics';
import { sampleMomentsWithMetadata } from '@/utils/sampleAfterglowData';

interface NightEvent {
  id: string;
  time: string;
  title: string;
  description?: string;
  type: "venue" | "floq" | "social" | "personal";
  participants?: string[];
  vibeMatch?: number;
  color: string;
  icon: string;
}

interface AfterglowScreenProps {
  date?: string;
}

const AfterglowScreen = ({ date }: AfterglowScreenProps) => {
  const { crossedPaths, isLoading: crossedPathsLoading, error: crossedPathsError, refetch: refetchCrossedPaths, count: crossedPathsCount } = useCrossedPathsToday();

  // Temporary error handler to get real stack trace
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.error('ERROR:', e.message, e.filename, e.lineno, e.colno);
      alert('ERROR: ' + e.message + ' at ' + e.filename + ':' + e.lineno);
    };
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.error('PROMISE:', e.reason);
      alert('PROMISE: ' + e.reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
  const [showAllCrossedPaths, setShowAllCrossedPaths] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  /* Always use the enhanced timeline - no more flags */
  
  // Use provided date or default to today
  const currentDate = date || new Date().toISOString().split('T')[0];
  const { afterglow, loading: afterglowLoading, isGenerating, generationProgress, isStale, refresh } = useRealtimeAfterglowData(currentDate);
  
  const formattedDate = useMemo(
    () => format(new Date(currentDate), "EEEE, MMM do yyyy"),
    [currentDate]
  );
  const { mutate: togglePinned } = useTogglePinned();
  
  // Get current moment for ambient background - disable for now due to type issues
  useAmbientBackground(undefined);
  
  const [nightEvents] = useState<NightEvent[]>([
    {
      id: "1",
      time: "9:18 PM",
      title: "Echo Rooftop",
      description: "92% vibe match • you saw 6 people",
      type: "venue",
      vibeMatch: 92,
      color: "hsl(180 70% 60%)",
      icon: "venue"
    },
    {
      id: "2",
      time: "10:45 PM", 
      title: "Nico's Chill Floq",
      type: "floq",
      color: "hsl(240 70% 60%)",
      icon: "floq"
    },
    {
      id: "3",
      time: "11:37 PM",
      title: "Hyped",
      participants: ["Julia", "Marcus", "Sam"],
      type: "social",
      color: "hsl(280 70% 60%)",
      icon: "social"
    },
    {
      id: "4",
      time: "12:22 AM",
      title: "introspective",
      type: "personal",
      color: "hsl(320 70% 60%)",
      icon: "personal"
    }
  ]);

  const getEventTypeIcon = (type: string) => {
    switch(type) {
      case "venue_checkin": 
      case "venue": 
        return <div className={`w-5 h-5 rounded-full bg-accent/20 border border-accent/40`} />;
      case "floq_join":
      case "floq": 
        return <div className={`w-5 h-5 rounded-full bg-primary/20 border border-primary/40`} />;
      case "plan_start":
      case "social": 
        return <div className={`w-5 h-5 rounded-full bg-secondary/20 border border-secondary/40`} />;
      case "vibe_change":
      case "personal": 
        return <div className={`w-5 h-5 rounded-full bg-muted/20 border border-muted/40`} />;
      default: 
        return <div className={`w-2 h-2 rounded-full bg-foreground/20`} />;
    }
  };

  const [emotionalPosition, setEmotionalPosition] = useState(75);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const energySummary = {
    totalStops: afterglow?.total_venues || 0,
    peopleCrossed: crossedPathsCount,
    floqsJoined: afterglow?.total_floqs || 0,
    mostFeltVibe: getVibeDisplayName(afterglow?.dominant_vibe || "chill"),
    vibeIntensity: afterglow?.energy_score || 0,
    connectionsMade: afterglow?.crossed_paths_count || 0
  };
  
  const emotionalStates = [
    { time: "8PM", emotion: "CHILL", color: "hsl(180 70% 60%)", position: 0 },
    { time: "9PM", emotion: "SOCIAL", color: "hsl(240 70% 60%)", position: 25 },
    { time: "11PM", emotion: "CONNECTED", color: "hsl(280 70% 60%)", position: 50 },
    { time: "12AM", emotion: "HYPE", color: "hsl(320 70% 60%)", position: 75 },
    { time: "1AM", emotion: "REFLECTIVE", color: "hsl(200 50% 70%)", position: 100 }
  ];

  const handleEmotionalScrub = (position: number) => {
    setEmotionalPosition(position);
    // Auto-scroll timeline to match emotional position
    if (timelineRef.current) {
      const scrollPosition = (position / 100) * (timelineRef.current.scrollHeight - timelineRef.current.clientHeight);
      timelineRef.current.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (timelineRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = timelineRef.current;
        const scrollPercent = (scrollTop / (scrollHeight - clientHeight)) * 100;
        setEmotionalPosition(Math.min(Math.max(scrollPercent, 0), 100));
      }
    };

    const timeline = timelineRef.current;
    if (timeline) {
      timeline.addEventListener('scroll', handleScroll);
      return () => timeline.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const getTimelineColor = (index: number) => {
    const colors = [
      "hsl(180 70% 60%)",
      "hsl(240 70% 60%)", 
      "hsl(280 70% 60%)",
      "hsl(320 70% 60%)"
    ];
    return colors[index % colors.length];
  };

  return (
    <>
      {/* Ambient particle field */}
      <ParticleField density={48} />
      
      <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start p-6 pt-16">
        <div className="space-y-1">
          <h1 className="text-4xl font-light glow-primary">afterglow</h1>
          <p className="text-sm font-medium tracking-wider text-muted-foreground opacity-0 animate-fade-in">
            {formattedDate}
          </p>
          <p className="text-xs text-muted-foreground/60">
            On this day
          </p>
        </div>
        <div className="flex space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:glow-secondary"
            onClick={() => setCalendarOpen(true)}
          >
            <Calendar className="h-6 w-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:glow-secondary"
            onClick={() => setInsightsOpen(true)}
          >
            <Brain className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* New Afterglow Card */}
      <div className="px-6 mb-8">
        {afterglow ? (
          <AfterglowCard 
            afterglow={afterglow as any} 
            onRefresh={refresh}
            isStale={isStale}
          />
        ) : afterglowLoading ? (
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30 animate-pulse">
            <div className="h-8 bg-muted/30 rounded mb-4"></div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="h-12 bg-muted/30 rounded"></div>
              <div className="h-12 bg-muted/30 rounded"></div>
              <div className="h-12 bg-muted/30 rounded"></div>
              <div className="col-span-2 h-16 bg-muted/30 rounded"></div>
            </div>
            <div className="h-12 bg-muted/30 rounded"></div>
          </div>
        ) : (
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Afterglow Yet</h3>
            <p className="text-muted-foreground mb-4">
              Your afterglow will appear here once you start exploring and creating memories.
            </p>
            <Button onClick={refresh} className="bg-gradient-to-r from-primary to-primary/80">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Afterglow
            </Button>
          </div>
        )}
      </div>

      {/* Crossed Paths Section */}
      <div className="px-6 mb-8">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="text-xl text-foreground">Crossed Paths</h2>
            </div>
            {crossedPathsCount > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCrossedPaths(!showAllCrossedPaths)}
                className="text-accent hover:glow-secondary"
              >
                {showAllCrossedPaths ? "Show Less" : `View All ${crossedPathsCount}`}
                <ChevronRight className={`w-4 h-4 ml-1 transition-transform duration-300 ${showAllCrossedPaths ? 'rotate-90' : ''}`} />
              </Button>
            )}
          </div>

          {crossedPathsError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Failed to load crossed paths</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetchCrossedPaths()}
                  className="ml-3"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : crossedPathsLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 mx-auto mb-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Finding people you crossed paths with...</p>
            </div>
          ) : crossedPathsCount > 0 ? (
            <div className="space-y-3">
              {(showAllCrossedPaths ? crossedPaths : crossedPaths.slice(0, 3)).map((person) => (
                <CrossedPathsCard key={person.user_id} person={person} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No crossed paths today yet</p>
              <p className="text-sm mt-2">Keep exploring to discover new connections!</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 relative">
        {/* Loading and generation states */}
        {afterglowLoading && !isGenerating ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading afterglow data...</p>
          </div>
        ) : isGenerating && typeof generationProgress === 'object' ? (
          <AfterglowGenerationProgress progress={generationProgress} />
        ) : isGenerating ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Generating your afterglow...</p>
          </div>
        ) : !afterglow ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No timeline data available yet</p>
            <Button 
              variant="outline" 
              onClick={refresh}
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Timeline
            </Button>
          </div>
        ) : afterglow?.moments?.length ? (
          /* Always use Enhanced Timeline - no more flags */
          <EnhancedTimeline moments={sampleMomentsWithMetadata.slice(0, 3)} />
        ) : (
          /* Show sample moments for demo */
          <EnhancedTimeline moments={sampleMomentsWithMetadata.slice(0, 2)} />
        )}
      </div>

      {/* Interactive Emotional Ribbon */}
      <div className="px-6 py-8 mt-8 border-t border-border/30">
        <h3 className="text-sm text-muted-foreground mb-4">Emotional Journey</h3>
        <div className="relative mb-4">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            {emotionalStates.map((state) => (
              <div key={state.time} className="text-center">
                <span className="font-medium">{state.time}</span>
                <div 
                  className="px-2 py-1 rounded-full text-xs font-medium mt-1 transition-smooth"
                  style={{ 
                    backgroundColor: `${state.color}20`, 
                    color: state.color,
                    border: `1px solid ${state.color}40`
                  }}
                >
                  {state.emotion}
                </div>
              </div>
            ))}
          </div>
          
          {/* Interactive scrubber */}
          <div className="relative">
            <div className="h-3 bg-gradient-to-r from-accent via-primary via-secondary to-destructive rounded-full opacity-60 cursor-pointer"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const position = ((e.clientX - rect.left) / rect.width) * 100;
                   handleEmotionalScrub(position);
                 }}
            />
            
            {/* Scrubber handle */}
            <div 
              className="absolute top-1/2 w-6 h-6 rounded-full gradient-primary border-2 border-background shadow-lg transform -translate-y-1/2 cursor-grab active:cursor-grabbing transition-smooth hover:scale-110 glow-primary"
              style={{ left: `${emotionalPosition}%`, transform: 'translateX(-50%) translateY(-50%)' }}
              onMouseDown={(e) => {
                const container = e.currentTarget.parentElement;
                if (!container) return;
                
                const handleMouseMove = (e: MouseEvent) => {
                  const rect = container.getBoundingClientRect();
                  const position = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 0), 100);
                  handleEmotionalScrub(position);
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>
        </div>
        
        {/* Current emotional state indicator */}
        <div className="text-center">
          <div className="text-lg font-medium glow-primary">
            {emotionalStates.find(state => 
              Math.abs(state.position - emotionalPosition) < 15
            )?.emotion || "TRANSITIONING"}
          </div>
          <div className="text-xs text-muted-foreground">current emotional state</div>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>

      {/* Calendar and Insights Modals */}
      {calendarOpen && (
        <AfterglowCalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} />
      )}
      {insightsOpen && afterglow?.id && (
        <AfterglowInsightsModal 
          open={insightsOpen} 
          onOpenChange={setInsightsOpen} 
          afterglowId={afterglow.id} 
        />
      )}
      
      {/* Moment Detail Drawer */}
      <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>}>
        <MomentDetailDrawer />
      </Suspense>
      </div>
    </>
  );
};

export default AfterglowScreen;