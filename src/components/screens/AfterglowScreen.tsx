import { useState } from "react";

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
      icon: "🍻"
    },
    {
      id: "2",
      time: "10:45 PM", 
      title: "Nico's Chill Floq",
      type: "floq",
      color: "hsl(240 70% 60%)",
      icon: "🌀"
    },
    {
      id: "3",
      time: "11:37 PM",
      title: "Hyped",
      participants: ["Julia", "Marcus", "Sam"],
      type: "social",
      color: "hsl(280 70% 60%)",
      icon: "🎉"
    },
    {
      id: "4",
      time: "12:22 AM",
      title: "introspective",
      type: "personal",
      color: "hsl(320 70% 60%)",
      icon: "💭"
    }
  ]);

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
        <h1 className="text-4xl font-light">afterglow</h1>
        <div className="flex space-x-4">
          <button className="text-2xl">📊</button>
          <button className="text-2xl">🌙</button>
        </div>
      </div>

      {/* Energy Summary */}
      <div className="px-6 mb-8">
        <h2 className="text-xl text-muted-foreground mb-4">Energy Summary</h2>
        <div className="flex justify-between items-center mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold">{energySummary.peopleCrossed}</div>
            <div className="text-sm text-muted-foreground">people crossed paths</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{energySummary.floqsVisited}</div>
            <div className="text-sm text-muted-foreground">Floqs nip/cd</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">1</div>
            <div className="text-sm text-muted-foreground">Most felt emotion {energySummary.topEmotion}</div>
          </div>
        </div>

        <button className="w-full bg-card/60 backdrop-blur-xl rounded-2xl py-3 text-foreground font-medium border border-border/30 transition-all duration-300 hover:scale-[1.02]">
          Revisit This Night
        </button>
      </div>

      {/* Timeline */}
      <div className="px-6 relative">
        {/* Timeline line */}
        <div className="absolute left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-accent via-primary to-destructive rounded-full"></div>

        <div className="space-y-8">
          {nightEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start space-x-6">
              {/* Timeline dot */}
              <div 
                className="relative z-10 w-6 h-6 rounded-full flex-shrink-0 animate-pulse-glow"
                style={{
                  backgroundColor: getTimelineColor(index),
                  boxShadow: `0 0 20px ${getTimelineColor(index)}`
                }}
              ></div>

              {/* Event card */}
              <div className="flex-1 bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/30 transition-all duration-300 hover:scale-[1.02]">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-muted-foreground text-sm">{event.time}</span>
                    <span className="text-xl">{event.icon}</span>
                  </div>
                  
                  {event.id === "1" && (
                    <div className="flex space-x-2">
                      <button className="bg-secondary/50 text-secondary-foreground px-3 py-1 rounded-lg text-xs transition-all duration-300 hover:scale-105">
                        ✉️ Send Thank You
                      </button>
                      <button className="bg-accent/20 text-accent px-3 py-1 rounded-lg text-xs transition-all duration-300 hover:scale-105">
                        🔄 ↑
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold mb-1">{event.title}</h3>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                )}

                {event.participants && (
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      {event.participants.map((participant, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-full bg-gradient-secondary border-2 border-background"></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom emotion scale */}
      <div className="px-6 py-8 mt-8 border-t border-border/30">
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>8PM</span>
          <span>CHILL</span>
          <span>CONNECTED</span>
          <span>HYPE</span>
          <span>1AM</span>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>
    </div>
  );
};