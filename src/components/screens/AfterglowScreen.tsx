import { useState, useRef, useEffect } from "react";
import { Calendar, Brain, Mail, RotateCcw, Heart, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export const AfterglowScreen = () => {
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
    const iconClasses = "w-5 h-5 text-muted-foreground";
    switch(type) {
      case "venue": return <div className={`w-5 h-5 rounded-full bg-accent/20 border border-accent/40`} />;
      case "floq": return <div className={`w-5 h-5 rounded-full bg-primary/20 border border-primary/40`} />;
      case "social": return <div className={`w-5 h-5 rounded-full bg-secondary/20 border border-secondary/40`} />;
      case "personal": return <div className={`w-5 h-5 rounded-full bg-muted/20 border border-muted/40`} />;
      default: return <div className={`w-2 h-2 rounded-full bg-foreground/20`} />;
    }
  };

  const [emotionalPosition, setEmotionalPosition] = useState(75);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const energySummary = {
    totalStops: 8,
    peopleCrossed: 12,
    floqsJoined: 4,
    mostFeltVibe: "flowing",
    vibeIntensity: 87,
    connectionsMade: 3
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
          <Button variant="ghost" size="icon" className="hover:glow-secondary">
            <Calendar className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:glow-secondary">
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

      {/* Timeline */}
      <div className="px-6 relative">
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

        <div className="space-y-8">
          {nightEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start space-x-6">
              {/* Timeline dot */}
              <div 
                className="relative z-10 w-6 h-6 rounded-full flex-shrink-0 animate-pulse-glow border-2 border-background"
                style={{
                  backgroundColor: getTimelineColor(index),
                  boxShadow: `0 0 30px ${getTimelineColor(index)}40`
                }}
              ></div>

              {/* Event card */}
              <div className="flex-1 bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/40 transition-smooth hover:glow-secondary hover:scale-[1.02]">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-muted-foreground text-sm font-medium">{event.time}</span>
                    {getEventTypeIcon(event.type)}
                  </div>
                  
                  {event.id === "1" && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" className="h-8 px-3 text-xs transition-smooth hover:glow-secondary">
                      <Mail className="w-3 h-3 mr-1" />
                      Send Thank You
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs transition-smooth hover:glow-active">
                      <Heart className="w-3 h-3 mr-1" />
                      Save Moment
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs transition-smooth hover:glow-active">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Reflect
                    </Button>
                  </div>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-2 text-foreground">{event.title}</h3>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                )}

                {event.participants && (
                  <div className="flex items-center space-x-3">
                    <div className="flex -space-x-2">
                      {event.participants.map((participant, idx) => (
                        <div 
                          key={idx} 
                          className="w-8 h-8 rounded-full gradient-secondary border-2 border-background shadow-lg transition-smooth hover:scale-110"
                          title={participant}
                        ></div>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      with {event.participants.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
};