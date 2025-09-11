import { useState, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, Brain, Mail, RotateCcw, Heart, BookOpen, Sparkles, Users, ChevronRight, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
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
import { haptics } from '@/utils/haptics';
import { sampleMomentsWithMetadata } from '@/utils/sampleAfterglowData';
import { Database } from '@/integrations/supabase/types';
import { zIndex } from '@/constants/z';

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
  const [searchParams] = useSearchParams();
  const selectedDateFromUrl = searchParams.get('date');
  
  // Use URL date parameter, then prop, then default to today
  const currentDate = selectedDateFromUrl || date || new Date().toISOString().split('T')[0];
  const { crossedPaths, isLoading: crossedPathsLoading, error: crossedPathsError, refetch: refetchCrossedPaths, count: crossedPathsCount } = useCrossedPathsToday();

  // Remove development error handler for TestFlight
  const [showAllCrossedPaths, setShowAllCrossedPaths] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [showCrowdPulse, setShowCrowdPulse] = useState(false);
  
  const { afterglow, isLoading: afterglowLoading, generate } = useRealtimeAfterglowData(currentDate);
  const refresh = generate;
  
  const formattedDate = useMemo(
    () => format(new Date(currentDate), "EEEE, MMM do yyyy"),
    [currentDate]
  );
  const { mutate: togglePinned } = useTogglePinned();
  
  // Ambient background now managed globally in FloqApp
  
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

  const isToday = useMemo(() => {
    const today = new Date();
    return currentDate === today.toISOString().split('T')[0];
  }, [currentDate]);

  const hasRealData = useMemo(() => {
    return afterglow?.total_venues > 0 || crossedPathsCount > 0 || afterglow?.total_floqs > 0;
  }, [afterglow, crossedPathsCount]);

  return (
    <>
      {/* Ambient particle field */}
      <ParticleField density={48} />
      
      <div className="min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start p-6 pt-16">
        <div className="space-y-3">
          <div className="relative">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-silver-200 animate-ripple-wave tracking-wide">
              ripple
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-silver-200 animate-ripple-wave"></div>
            <p className="text-sm font-medium tracking-wider text-white/60 animate-fade-in">
              {formattedDate}
            </p>
          </div>
        </div>
        <div className="flex space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/30 transition-all duration-300 hover:scale-110 shadow-lg"
            onClick={() => setCalendarOpen(true)}
            aria-label="Open calendar to select date"
          >
            <Calendar className="h-6 w-6 text-white/90" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/30 transition-all duration-300 hover:scale-110 shadow-lg"
            onClick={() => setInsightsOpen(true)}
            aria-label="Open insights and analytics"
          >
            <Brain className="h-6 w-6 text-white/90" />
          </Button>
        </div>
      </div>

      {/* Always show Afterglow Card */}
      <div className="px-6 mb-8">
        {afterglowLoading ? (
          <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-6 border border-border/30 animate-pulse">
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
          <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-6 border border-border/30 shadow-xl">
            {/* AI Summary Section */}
            {(afterglow?.ai_summary || !hasRealData) && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">AI Journey Summary</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {afterglow?.ai_summary || "Your journey awaits! Start exploring to discover new connections and create memorable moments."}
                </p>
              </div>
            )}

            {/* Condensed Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-500/20">
                <div className="text-2xl font-bold text-violet-400 mb-1">
                  {afterglow?.total_venues || 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Venues
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-sky-500/10 to-sky-600/5 border border-sky-500/20">
                <div className="text-2xl font-bold text-sky-400 mb-1">
                  {afterglow?.crossed_paths_count || 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  People
                </div>
              </div>
              <div className="text-center p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400 mb-1">
                  {afterglow?.total_floqs || 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Floqs
                </div>
              </div>
            </div>

            {/* Peak Vibe Section */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {hasRealData ? (afterglow?.energy_score || 0) : Math.round(Math.random() * 10) + 5}%
                </div>
                <div className="text-sm text-muted-foreground mb-2">peak vibe intensity</div>
                <div className="text-sm font-medium text-primary/80 capitalize">
                  {hasRealData ? (afterglow?.dominant_vibe || 'chill') : 'chill'}
                </div>
              </div>
            </div>

            {/* Crossed Paths Section */}
            <div className="border-t border-border/30 pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Crossed Paths</span>
                </div>
                {crossedPathsCount > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllCrossedPaths(!showAllCrossedPaths)}
                    className="text-xs text-accent hover:glow-secondary"
                  >
                    {showAllCrossedPaths ? "Show Less" : `View All ${crossedPathsCount}`}
                    <ChevronRight className={`w-3 h-3 ml-1 transition-transform duration-300 ${showAllCrossedPaths ? 'rotate-90' : ''}`} />
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
                <div className="text-center py-4">
                  <div className="w-6 h-6 mx-auto mb-2 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground">Finding people you crossed paths with...</p>
                </div>
              ) : crossedPathsCount > 0 ? (
                <div className="space-y-2">
                  {(showAllCrossedPaths ? crossedPaths : crossedPaths.slice(0, 3)).map((person) => (
                    <CrossedPathsCard key={person.profile_id} person={person} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No crossed paths today yet</p>
                  <p className="text-xs mt-1">Keep exploring to discover new connections!</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            {!isToday && (
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300"
                onClick={refresh}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Revisit this day
              </Button>
            )}
            {isToday && (
              <Button 
                className="w-full mt-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300"
                onClick={refresh}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Refresh journey
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Crowd Pulse Toggle */}
      {afterglow?.total_venues > 0 && (
        <div className="px-6 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCrowdPulse(!showCrowdPulse)}
            className="text-primary hover:glow-primary transition-all duration-300"
          >
            {showCrowdPulse ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Crowd Pulse
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Show Crowd Pulse
              </>
            )}
          </Button>
        </div>
      )}

      {/* Presence Heatmap - Collapsed by default */}
      {showCrowdPulse && afterglow?.total_venues > 0 && (
        <div className="px-6 mb-8">
          <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-secondary animate-pulse"></div>
              <h2 className="text-xl text-foreground">Crowd Pulse</h2>
            </div>
            
            <div className="relative h-32 bg-gradient-to-br from-background to-muted rounded-2xl overflow-hidden">
              {/* Animated heatmap dots representing venues and interactions */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                  {Array.from({ length: Math.min(afterglow.total_venues, 6) }).map((_, i) => (
                    <div
                      key={i}
                      className="relative"
                      style={{
                        animationDelay: `${i * 0.2}s`
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/60 to-secondary/60 animate-pulse-glow"></div>
                      <div className="absolute inset-0 w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 animate-ping"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Motion trails connecting the dots */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
                <defs>
                  <linearGradient id="motionTrail" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 60 Q 60 20 100 60 Q 140 100 180 60"
                  stroke="url(#motionTrail)"
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                  strokeDasharray="5,5"
                />
              </svg>
            </div>
            
            <div className="flex justify-between items-center text-sm text-muted-foreground mt-3">
              <span>{afterglow.total_venues} venues visited</span>
              <span>{afterglow.crossed_paths_count} people encountered</span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-6 relative">
        {/* Loading and generation states */}
        {afterglowLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Loading ripple data...</p>
          </div>
        ) : !afterglow ? (
          <div className="text-center py-16">
            <div className="relative mb-8">
              <Sparkles className="w-20 h-20 mx-auto text-muted-foreground/30 animate-pulse" />
              {/* Ripple circles around the sparkle */}
              <div className="absolute inset-0 w-full h-full">
                <div className="absolute inset-0 w-full h-full border-2 border-primary/20 rounded-full animate-ping"></div>
                <div className="absolute inset-0 w-full h-full border-2 border-secondary/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-0 w-full h-full border-2 border-accent/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Your Ripple Awaits</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Start exploring to create your first ripple. Visit venues, join floqs, and connect with people to build your story.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="outline" 
                onClick={refresh}
                className="hover:glow-secondary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Timeline
              </Button>
              <Button 
                variant="default"
                onClick={() => window.location.href = '/'}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Explore Field
              </Button>
            </div>
          </div>
        ) : afterglow?.moments ? (
          (() => {
            const moments = afterglow?.moments ?? [];
            
            // Type guard to ensure moments is an array
            if (Array.isArray(moments) && moments.length > 0) {
              // Use real afterglow moments when available
              return (
                <EnhancedTimeline moments={moments.map((momentStr: any, index: number) => {
                  try {
                    // Handle both string and object formats
                    const moment = typeof momentStr === 'string' ? JSON.parse(momentStr) : momentStr;
                    return {
                      id: moment.id || `moment-${index}`,
                      timestamp: moment.timestamp || new Date().toISOString(),
                      title: moment.title || 'Moment',
                      description: moment.description,
                      color: moment.color || '#7B61FF',
                      moment_type: moment.moment_type || 'personal',
                      metadata: moment.metadata || {}
                    };
                  } catch (e) {
                    console.error('Failed to parse moment:', momentStr, e);
                    return {
                      id: `fallback-${index}`,
                      timestamp: new Date().toISOString(),
                      title: 'Moment',
                      color: '#7B61FF',
                      moment_type: 'personal',
                      metadata: {}
                    };
                  }
                })} />
              );
            } else {
              // Empty state for no moments - show sample data instead
              return (
                <div>
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary/80 font-medium">Demo Timeline</span>
                    </div>
                  </div>
                  <EnhancedTimeline moments={sampleMomentsWithMetadata.map((moment, index) => ({
                    id: moment.id || `sample-moment-${index}`,
                    timestamp: moment.timestamp,
                    title: moment.title,
                    description: moment.description,
                    color: moment.color,
                    moment_type: moment.moment_type,
                    metadata: moment.metadata
                  }))} />
                </div>
              );
            }
          })()
        ) : (
          /* Show sample moments for demo when no afterglow data */
          <div>
            <div className="text-center mb-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary/80 font-medium">Demo Timeline</span>
              </div>
            </div>
            <EnhancedTimeline moments={sampleMomentsWithMetadata.map((moment, index) => ({
              id: moment.id || `sample-moment-${index}`,
              timestamp: moment.timestamp,
              title: moment.title,
              description: moment.description,
              color: moment.color,
              moment_type: moment.moment_type,
              metadata: moment.metadata
            }))} />
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
                  className="px-2 py-1 rounded-full text-xs font-medium mt-1 transition-smooth hover:scale-105 cursor-pointer"
                  style={{ 
                    backgroundColor: `${state.color}20`, 
                    color: state.color,
                    border: `1px solid ${state.color}40`
                  }}
                  onClick={() => handleEmotionalScrub(state.position)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEmotionalScrub(state.position);
                    }
                  }}
                  aria-label={`Jump to ${state.emotion} at ${state.time}`}
                >
                  {state.emotion}
                </div>
              </div>
            ))}
          </div>
          
          {/* Interactive scrubber */}
          <div className="relative">
            <div 
              className="h-3 bg-gradient-to-r from-accent via-primary via-secondary to-destructive rounded-full opacity-60 cursor-pointer transition-opacity hover:opacity-80"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const position = ((e.clientX - rect.left) / rect.width) * 100;
                handleEmotionalScrub(position);
              }}
              role="slider"
              aria-label="Emotional journey timeline"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={emotionalPosition}
              tabIndex={0}
              onKeyDown={(e) => {
                const step = 5;
                let newPosition = emotionalPosition;
                
                switch (e.key) {
                  case 'ArrowLeft':
                    e.preventDefault();
                    newPosition = Math.max(0, emotionalPosition - step);
                    break;
                  case 'ArrowRight':
                    e.preventDefault();
                    newPosition = Math.min(100, emotionalPosition + step);
                    break;
                  case 'Home':
                    e.preventDefault();
                    newPosition = 0;
                    break;
                  case 'End':
                    e.preventDefault();
                    newPosition = 100;
                    break;
                  default:
                    return;
                }
                handleEmotionalScrub(newPosition);
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
              role="presentation"
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
          aiSummary={afterglow.ai_summary}
        />
      )}
      
      {/* Moment Detail Drawer */}
      <Suspense fallback={<div {...zIndex('overlay')} className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>}>
        <MomentDetailDrawer />
      </Suspense>
      </div>
    </>
  );
};

export default AfterglowScreen;