import { useState, useRef, useCallback } from "react";
import { Radio } from "lucide-react";

type VibeState = "hype" | "social" | "romantic" | "weird" | "open" | "flowing" | "down" | "solo" | "chill";

interface VibeInfo {
  label: string;
  angle: number;
  color: string;
}

export const VibeScreen = () => {
  const [selectedVibe, setSelectedVibe] = useState<VibeState>("chill");
  const [isDragging, setIsDragging] = useState(false);
  const [activeDuration, setActiveDuration] = useState(37);
  const dialRef = useRef<HTMLDivElement>(null);

  const vibes: Record<VibeState, VibeInfo> = {
    chill: { label: "Chill", angle: 0, color: "hsl(var(--accent))" },
    hype: { label: "Hype", angle: 40, color: "hsl(0 70% 60%)" },
    social: { label: "Social", angle: 80, color: "hsl(200 70% 60%)" },
    romantic: { label: "Romantic", angle: 120, color: "hsl(320 70% 60%)" },
    weird: { label: "Weird", angle: 160, color: "hsl(60 70% 60%)" },
    open: { label: "Open", angle: 200, color: "hsl(120 70% 60%)" },
    flowing: { label: "Flowing", angle: 240, color: "hsl(30 70% 60%)" },
    down: { label: "Down", angle: 280, color: "hsl(280 70% 60%)" },
    solo: { label: "Solo", angle: 320, color: "hsl(240 70% 60%)" }
  };

  const statusUpdates = [
    "Feed priority has shifted toward Chill Floqs",
    "Pulse is scanning venues with low lighting + mellow music", 
    "Your vibe is now visible to 19 friends nearby",
    "4 people with matching vibes in a 2-mile radius"
  ];

  const handleVibeSelect = useCallback((vibe: VibeState) => {
    setSelectedVibe(vibe);
    // Brief haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getCurrentVibeDescription = () => {
    switch (selectedVibe) {
      case "chill": return "Calm • Peaceful • Grounded";
      case "hype": return "Energetic • Excited • Ready";
      case "social": return "Connected • Outgoing • Open";
      case "romantic": return "Intimate • Affectionate • Warm";
      case "weird": return "Playful • Unique • Creative";
      case "open": return "Curious • Receptive • Flowing";
      case "flowing": return "Natural • Easy • Smooth";
      case "down": return "Reflective • Quiet • Inward";
      case "solo": return "Independent • Focused • Centered";
      default: return "Present • Aware • Here";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header Bar */}
      <div className="flex justify-between items-center p-6 pt-16">
        <button className="p-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60">
          <Radio className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-medium text-foreground glow-primary">vibe</h1>
        <button className="p-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60">
          <Radio className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Radial Vibe Selector */}
      <div className="px-6 mb-8">
        <div 
          ref={dialRef}
          className="relative w-80 h-80 mx-auto"
          onTouchStart={handleDragStart}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        >
          {/* Outer gradient ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-vibe p-1">
            <div className="w-full h-full rounded-full bg-background/95 backdrop-blur-sm"></div>
          </div>
          
          {/* Vibe labels around the circle */}
          {Object.entries(vibes).map(([key, vibe]) => {
            const isSelected = key === selectedVibe;
            const radian = (vibe.angle * Math.PI) / 180;
            const radius = 130;
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;
            
            return (
              <button
                key={key}
                onClick={() => handleVibeSelect(key as VibeState)}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 px-3 py-2 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  isSelected 
                    ? "text-primary font-bold scale-110 bg-primary/10 backdrop-blur-sm border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30 hover:scale-105"
                }`}
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                }}
              >
                <span className="text-sm font-medium">{vibe.label}</span>
              </button>
            );
          })}

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                {vibes[selectedVibe].label}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {getCurrentVibeDescription()}
              </p>
              <div className="w-16 h-16 rounded-full bg-gradient-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center transition-all duration-500 animate-pulse-glow">
                <div className="w-8 h-8 rounded-full bg-gradient-primary"></div>
              </div>
            </div>
          </div>

          {/* Selection indicator */}
          <div 
            className="absolute w-3 h-3 rounded-full transition-all duration-500 animate-pulse-glow"
            style={{
              backgroundColor: vibes[selectedVibe].color,
              boxShadow: `0 0 15px ${vibes[selectedVibe].color}`,
              left: `calc(50% + ${Math.cos((vibes[selectedVibe].angle * Math.PI) / 180) * 115}px)`,
              top: `calc(50% + ${Math.sin((vibes[selectedVibe].angle * Math.PI) / 180) * 115}px)`,
              transform: "translate(-50%, -50%)"
            }}
          ></div>
        </div>
      </div>

      {/* Vibe Impact Panel */}
      <div className="px-6 mb-6">
        <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/30">
          <h3 className="font-semibold mb-4 text-foreground">Vibe Impact</h3>
          <div className="space-y-3">
            {statusUpdates.map((update, index) => (
              <div key={index} className="flex items-start space-x-3 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                  style={{ backgroundColor: index < 2 ? "hsl(var(--muted-foreground))" : "hsl(var(--accent))" }}
                ></div>
                <p className="text-sm text-muted-foreground leading-relaxed">{update}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional Density Map Preview */}
      <div className="px-6 mb-6">
        <button className="w-full bg-card/40 backdrop-blur-xl rounded-2xl p-4 border border-border/30 transition-all duration-300 hover:bg-card/60 hover:scale-[1.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-secondary/20 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-gradient-secondary animate-pulse"></div>
              </div>
              <div className="text-left">
                <h4 className="font-medium text-foreground">Emotional Density Map</h4>
                <p className="text-xs text-muted-foreground">Tap to explore energy clusters</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-accent">4 matches</div>
              <div className="text-xs text-muted-foreground">2mi radius</div>
            </div>
          </div>
        </button>
      </div>

      {/* Mini Vibe Card */}
      <div className="fixed bottom-20 left-6 right-6">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-4 border border-border/30 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: vibes[selectedVibe].color }}
              ></div>
              <div>
                <span className="font-medium text-foreground">{vibes[selectedVibe].label}</span>
                <div className="text-xs text-muted-foreground">Active for {activeDuration} min</div>
              </div>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
              Clear Vibe
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-32"></div>
    </div>
  );
};