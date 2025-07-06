import { useState } from "react";

type VibeState = "hype" | "social" | "romantic" | "weird" | "open" | "flowing" | "down" | "solo" | "chill";

interface VibeInfo {
  label: string;
  angle: number;
  color: string;
}

export const VibeScreen = () => {
  const [selectedVibe, setSelectedVibe] = useState<VibeState>("chill");
  const [vibeIntensity, setVibeIntensity] = useState(70);

  const vibes: Record<VibeState, VibeInfo> = {
    hype: { label: "Hype", angle: 0, color: "hsl(0 70% 60%)" },
    social: { label: "Social", angle: 45, color: "hsl(200 70% 60%)" },
    romantic: { label: "Romantic", angle: 90, color: "hsl(320 70% 60%)" },
    weird: { label: "Weird", angle: 135, color: "hsl(60 70% 60%)" },
    open: { label: "Open", angle: 180, color: "hsl(120 70% 60%)" },
    flowing: { label: "Flowing", angle: 225, color: "hsl(30 70% 60%)" },
    down: { label: "Down", angle: 270, color: "hsl(280 70% 60%)" },
    solo: { label: "Solo", angle: 315, color: "hsl(240 70% 60%)" },
    chill: { label: "Chill", angle: 360, color: "hsl(180 70% 60%)" }
  };

  const statusUpdates = [
    "Feed priority has shifted toward Chill Floqs",
    "Pulse is scanning venues with low lighting + mellow music", 
    "Your vibe is now visible to 19 friends nearby",
    "4 people with matching vibes in a 2-mile radius"
  ];

  const statusColors = ["hsl(210 40% 70%)", "hsl(210 40% 70%)", "hsl(60 70% 60%)", "hsl(120 70% 60%)"];

  return (
    <div className="min-h-screen p-6 pt-16 bg-gradient-to-b from-background to-secondary/20">
      {/* Vibe Wheel */}
      <div className="relative w-80 h-80 mx-auto mb-12">
        {/* Outer gradient ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-vibe p-2">
          <div className="w-full h-full rounded-full bg-background"></div>
        </div>
        
        {/* Vibe labels around the circle */}
        {Object.entries(vibes).map(([key, vibe]) => {
          const isSelected = key === selectedVibe;
          const radian = (vibe.angle * Math.PI) / 180;
          const radius = 140;
          const x = Math.cos(radian) * radius;
          const y = Math.sin(radian) * radius;
          
          return (
            <button
              key={key}
              onClick={() => setSelectedVibe(key as VibeState)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isSelected ? "text-primary font-bold scale-110" : "text-muted-foreground hover:text-foreground"
              }`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
            >
              {vibe.label}
            </button>
          );
        })}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            {vibes[selectedVibe].label}
          </h1>
          <div className="text-4xl animate-float">
            🧘
          </div>
        </div>

        {/* Selection indicator */}
        <div 
          className="absolute w-4 h-4 rounded-full animate-pulse-glow transition-all duration-500"
          style={{
            backgroundColor: vibes[selectedVibe].color,
            boxShadow: `0 0 20px ${vibes[selectedVibe].color}`,
            left: `calc(50% + ${Math.cos((vibes[selectedVibe].angle * Math.PI) / 180) * 120}px)`,
            top: `calc(50% + ${Math.sin((vibes[selectedVibe].angle * Math.PI) / 180) * 120}px)`,
            transform: "translate(-50%, -50%)"
          }}
        ></div>
      </div>

      {/* Status Updates */}
      <div className="space-y-4 mb-8">
        {statusUpdates.map((update, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusColors[index] }}
            ></div>
            <p className="text-sm text-muted-foreground">{update}</p>
          </div>
        ))}
      </div>

      {/* Bottom Action Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-card/60 backdrop-blur-xl rounded-2xl p-4 border border-border/30">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-field flex items-center justify-center">
              <span className="text-xl">🗺️</span>
            </div>
            <span className="font-medium">Emotional Density Map</span>
          </div>
          <button className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-xl font-medium transition-all duration-300 hover:scale-105">
            Clear Vibe
          </button>
        </div>

        {/* Intensity Slider */}
        <div className="bg-card/60 backdrop-blur-xl rounded-2xl p-6 border border-border/30">
          <div className="flex justify-between items-center mb-4">
            <span className="font-medium">Vibe Intensity</span>
            <span className="text-primary font-bold">{vibeIntensity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={vibeIntensity}
            onChange={(e) => setVibeIntensity(Number(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, ${vibes[selectedVibe].color} 0%, ${vibes[selectedVibe].color} ${vibeIntensity}%, hsl(var(--secondary)) ${vibeIntensity}%, hsl(var(--secondary)) 100%)`
            }}
          />
        </div>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>
    </div>
  );
};