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

  // Create subtle pulsing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase((prev) => (prev + 1) % 100);
    }, 80); // 80ms for smooth but subtle animation

    return () => clearInterval(interval);
  }, []);

  // Memoize color calculations for performance
  const colors = useMemo(() => {
    const vibeRgb = VIBE_RGB[currentVibe as Vibe] || VIBE_RGB.chill;
    const [r, g, b] = vibeRgb;

    // Calculate opacity based on animation phase (subtle wave motion)
    const baseOpacity = 0.15; // Very subtle base opacity
    const pulseIntensity = 0.1; // Gentle pulse variation
    const waveOpacity = baseOpacity + (Math.sin(animationPhase * 0.1) * pulseIntensity);

    return {
      primary: `rgba(${r}, ${g}, ${b}, ${waveOpacity})`,
      secondary: `rgba(${r}, ${g}, ${b}, ${waveOpacity * 0.3})`,
      tertiary: `rgba(${r}, ${g}, ${b}, 0)`,
    };
  }, [currentVibe, animationPhase]);

  return (
    <div className={cn("relative", className)}>
      {/* Outer glow ring */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300 ease-in-out"
        style={{
          background: `radial-gradient(circle, ${colors.tertiary} 30%, ${colors.secondary} 70%, ${colors.primary} 100%)`,
          transform: `scale(${1.15 + Math.sin(animationPhase * 0.08) * 0.05})`, // Very subtle scale variation
          filter: 'blur(1px)',
        }}
      />
      
      {/* Inner subtle ring */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-500 ease-in-out"
        style={{
          boxShadow: `0 0 ${8 + Math.sin(animationPhase * 0.12) * 2}px ${colors.primary}, inset 0 0 ${4 + Math.sin(animationPhase * 0.1) * 1}px ${colors.secondary}`,
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