import { useEffect, useState, useMemo } from 'react';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { VIBE_RGB, type Vibe } from '@/lib/vibes';
import { cn } from '@/lib/utils';

interface VibeGlowRingProps {
  className?: string;
  children: React.ReactNode;
}

export const VibeGlowRing = ({ className, children }: VibeGlowRingProps) => {
  const currentVibe = useCurrentVibe();
  const [animationPhase, setAnimationPhase] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create subtle pulsing animation - only start once
  useEffect(() => {
    if (intervalRef.current) return; // Prevent multiple intervals
    
    intervalRef.current = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 100);
    }, 120); // Slower animation to reduce renders

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Empty dependency array - this should only run once

  // Memoize color calculations for performance - throttle updates more aggressively
  const colors = useMemo(() => {
    const vibeRgb = VIBE_RGB[currentVibe as Vibe] || VIBE_RGB.chill;
    const [r, g, b] = vibeRgb;

    // Calculate opacity based on animation phase (stronger glow)
    const baseOpacity = 0.4; // Much stronger base opacity
    const pulseIntensity = 0.2; // More pronounced pulse variation
    const throttledPhase = Math.floor(animationPhase / 10) * 10; // Much more aggressive throttling
    const waveOpacity = baseOpacity + (Math.sin(throttledPhase * 0.1) * pulseIntensity);

    return {
      primary: `rgba(${r}, ${g}, ${b}, ${waveOpacity})`,
      secondary: `rgba(${r}, ${g}, ${b}, ${waveOpacity * 0.5})`,
      tertiary: `rgba(${r}, ${g}, ${b}, ${waveOpacity * 0.1})`,
    };
  }, [currentVibe, Math.floor(animationPhase / 10)]); // Much more aggressive throttling

  return (
    <div className={cn("relative", className)}>
      {/* Outer glow ring - stronger and thicker */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300 ease-in-out"
        style={{
          background: `radial-gradient(circle, ${colors.tertiary} 20%, ${colors.secondary} 60%, ${colors.primary} 100%)`,
          transform: `scale(${1.25 + Math.sin(animationPhase * 0.08) * 0.08})`, // Larger scale with more variation
          filter: 'blur(2px)',
        }}
      />
      
      {/* Middle glow layer */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-400 ease-in-out"
        style={{
          background: `radial-gradient(circle, transparent 40%, ${colors.secondary} 80%, ${colors.primary} 100%)`,
          transform: `scale(${1.2 + Math.sin(animationPhase * 0.1) * 0.06})`,
          filter: 'blur(1px)',
        }}
      />
      
      {/* Inner strong ring */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-500 ease-in-out"
        style={{
          boxShadow: `0 0 ${12 + Math.sin(animationPhase * 0.12) * 4}px ${colors.primary}, 0 0 ${6 + Math.sin(animationPhase * 0.1) * 2}px ${colors.secondary}, inset 0 0 ${6 + Math.sin(animationPhase * 0.1) * 2}px ${colors.secondary}`,
          borderRadius: '50%',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};