import * as React from "react";

export type VibeType = "social" | "chill" | "hype" | "creative" | "focus" | null;

export function VibeGradient({
  vibe,
  intensity = 0.6,
  className = "",
}: { 
  vibe: VibeType; 
  intensity?: number; 
  className?: string;
}) {
  const gradients = React.useMemo(() => {
    const alpha = Math.max(0.05, Math.min(0.3, intensity * 0.3));
    
    switch (vibe) {
      case "social":
        return `linear-gradient(135deg, 
          hsl(var(--primary) / ${alpha}) 0%, 
          hsl(var(--accent) / ${alpha * 0.7}) 50%, 
          hsl(var(--primary) / ${alpha * 0.5}) 100%)`;
      case "chill":
        return `linear-gradient(135deg, 
          hsl(210 50% 60% / ${alpha}) 0%, 
          hsl(190 40% 70% / ${alpha * 0.7}) 50%, 
          hsl(220 30% 80% / ${alpha * 0.5}) 100%)`;
      case "hype":
        return `linear-gradient(135deg, 
          hsl(0 80% 60% / ${alpha}) 0%, 
          hsl(20 90% 55% / ${alpha * 0.8}) 50%, 
          hsl(40 85% 50% / ${alpha * 0.6}) 100%)`;
      case "creative":
        return `linear-gradient(135deg, 
          hsl(280 70% 60% / ${alpha}) 0%, 
          hsl(320 60% 65% / ${alpha * 0.7}) 50%, 
          hsl(260 50% 70% / ${alpha * 0.5}) 100%)`;
      case "focus":
        return `linear-gradient(135deg, 
          hsl(120 30% 50% / ${alpha}) 0%, 
          hsl(140 25% 60% / ${alpha * 0.7}) 50%, 
          hsl(160 20% 70% / ${alpha * 0.5}) 100%)`;
      default:
        return `linear-gradient(135deg, 
          hsl(var(--muted) / ${alpha * 0.5}) 0%, 
          transparent 50%, 
          hsl(var(--muted) / ${alpha * 0.3}) 100%)`;
    }
  }, [vibe, intensity]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none rounded-lg ${className}`}
      style={{ background: gradients }}
      aria-hidden="true"
    />
  );
}