import { useState, useRef, useEffect } from "react";
import { Calendar, Brain, Mail, RotateCcw, Heart, BookOpen, Sparkles, Users, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCrossedPathsToday } from "@/hooks/useCrossedPathsToday";
import { CrossedPathsCard } from "@/components/CrossedPathsCard";
import { useAfterglowData } from "@/hooks/useAfterglowData";
import { AfterglowMomentCard } from "@/components/AfterglowMomentCard";
import { AfterglowGenerationProgress } from "@/components/AfterglowGenerationProgress";
import { getVibeDisplayName } from "@/utils/afterglowHelpers";
import { useTogglePinned } from "@/hooks/useOptimisticMutations";
import AfterglowCalendarDialog from "@/components/afterglow/AfterglowCalendarDialog";
import AfterglowInsightsModal from "@/components/afterglow/AfterglowInsightsModal";
import { useTimelineV2 } from "@/hooks/useTimelineV2";
import { EnhancedTimeline } from "@/components/timeline/EnhancedTimeline";
import { MomentDetailDrawer } from "@/components/MomentDetailDrawer";
import { Link } from "react-router-dom";

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
  const [showAllCrossedPaths, setShowAllCrossedPaths] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const timelineV2 = useTimelineV2();
  
  // Use provided date or default to today
  const currentDate = date || new Date().toISOString().split('T')[0];
  const { afterglow, isLoading: afterglowLoading, isGenerating, generationProgress, error: afterglowError, generateAfterglow } = useAfterglowData(currentDate);
  const { mutate: togglePinned } = useTogglePinned();
  
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
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center p-6 pt-16">
        <h1 className="text-4xl font-light glow-primary">afterglow</h1>
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

      {/* Energy Summary */}
      <div className="px-6 mb-8">
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
          <h2 className="text-xl text-muted-foreground mb-6">Energy Summary</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{energySummary.totalStops}</div>
              <div className="text-sm text-muted-foreground">total stops</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{energySummary.peopleCrossed}</div>
              <div className="text-sm text-muted-foreground">people crossed paths</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">{energySummary.floqsJoined}</div>
              <div className="text-sm text-muted-foreground">floqs joined</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold glow-primary">{energySummary.vibeIntensity}%</div>
              <div className="text-sm text-muted-foreground">peak vibe intensity</div>
              <div className="text-xs text-accent font-medium">{energySummary.mostFeltVibe}</div>
            </div>
          </div>

          <Button className="w-full gradient-primary text-primary-foreground font-medium transition-smooth hover:glow-active">
            Revisit This Night
          </Button>
        </div>
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
        {timelineV2 ? (
          // Enhanced Timeline V2
          <>
            {afterglow?.moments?.length ? (
              <EnhancedTimeline moments={afterglow.moments} />
            ) : null}
          </>
        ) : (
          // Legacy Timeline
          <>
            {/* Curved Timeline SVG */}
            <svg className="absolute left-0 top-0 h-full w-24 pointer-events-none" style={{zIndex: 1}}>
              <defs>
                <linearGradient id="timelineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(180 70% 60%)" />
                  <stop offset="25%" stopColor="hsl(240 70% 60%)" />
                  <stop offset="50%" stopColor="hsl(280 70% 60%)" />
                  <stop offset="75%" stopColor="hsl(320 70% 60%)" />
                  <stop offset="100%" stopColor="hsl(340 70% 60%)" />
                </linearGradient>
              </defs>
              <path
                d="M48 0 Q52 25 48 50 Q44 75 48 100 Q52 125 48 150 Q44 175 48 200 Q52 225 48 250 Q44 275 48 300 Q52 325 48 350 Q44 375 48 400 Q52 425 48 450 Q44 475 48 500"
                stroke="url(#timelineGradient)"
                strokeWidth="3"
                fill="none"
                className="drop-shadow-lg glow-primary"
              />
            </svg>
          </>
        )}

        {/* Loading and generation states */}
        {afterglowLoading && !isGenerating ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading afterglow data...</p>
          </div>
        ) : isGenerating && generationProgress ? (
          <AfterglowGenerationProgress progress={generationProgress} />
        ) : isGenerating ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Generating your afterglow...</p>
          </div>
        ) : afterglowError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load afterglow data</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => generateAfterglow(true)}
                className="ml-3"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : afterglow?.moments?.length ? (
          <div className="space-y-8" ref={timelineRef}>
            {afterglow.moments.map((moment, index) => (
              <AfterglowMomentCard
                key={`${moment.timestamp}-${index}`}
                moment={moment}
                index={index}
                isFirst={index === 0}
                data-moment-index={index}
                onShare={() => {
                  // Create a share URL for this specific moment
                  const shareUrl = `${window.location.origin}/afterglow/${afterglow.date}`
                  if (navigator.share) {
                    navigator.share({
                      title: 'My Afterglow',
                      text: afterglow.summary_text,
                      url: shareUrl
                    })
                  } else {
                    navigator.clipboard.writeText(shareUrl)
                  }
                }}
                onSave={() => {
                  if (afterglow?.id) {
                    togglePinned({ 
                      id: afterglow.id, 
                      pinned: !afterglow.is_pinned 
                    })
                  }
                }}
              />
            ))}
            
            {/* Insights link for timeline v2 */}
            {timelineV2 && afterglow?.id && (
              <div className="text-center mt-8 pt-8 border-t border-border/30">
                <Link 
                  to={`/afterglow/${afterglow.id}/insights`}
                  className="inline-flex items-center text-sm text-accent hover:text-accent/80 hover:underline"
                >
                  View detailed insights & analytics →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">No moments captured today</p>
            <p className="text-sm">Start exploring to create your afterglow!</p>
          </div>
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
      <MomentDetailDrawer />
    </div>
  );
};

export default AfterglowScreen;