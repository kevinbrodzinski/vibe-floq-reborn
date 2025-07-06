import { useState } from "react";
import { Calendar, Brain, Mail, RotateCcw } from "lucide-react";
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

  const energySummary = {
    peopleCrossed: 4,
    floqsVisited: 17,
    topEmotion: "flowing"
  };

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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{energySummary.peopleCrossed}</div>
              <div className="text-sm text-muted-foreground">people crossed paths</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">{energySummary.floqsVisited}</div>
              <div className="text-sm text-muted-foreground">Floqs visited</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">1</div>
              <div className="text-sm text-muted-foreground">Most felt emotion</div>
              <div className="text-xs text-accent font-medium">{energySummary.topEmotion}</div>
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
                    <div className="flex space-x-2">
                      <Button variant="secondary" size="sm" className="h-8 px-3 text-xs transition-smooth hover:glow-secondary">
                        <Mail className="w-3 h-3 mr-1" />
                        Send Thank You
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs transition-smooth hover:glow-active">
                        <RotateCcw className="w-3 h-3" />
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

      {/* Emotional Timeline Footer */}
      <div className="px-6 py-8 mt-8 border-t border-border/30">
        <h3 className="text-sm text-muted-foreground mb-4">Emotional Journey</h3>
        <div className="relative">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            <span className="font-medium">8PM</span>
            <span className="px-2 py-1 rounded-full bg-accent/20 text-accent">CHILL</span>
            <span className="px-2 py-1 rounded-full bg-primary/20 text-primary">CONNECTED</span>
            <span className="px-2 py-1 rounded-full bg-secondary/20 text-secondary">HYPE</span>
            <span className="font-medium">1AM</span>
          </div>
          <div className="h-2 bg-gradient-to-r from-accent via-primary via-secondary to-destructive rounded-full opacity-60"></div>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>
    </div>
  );
};