import React from 'react';
import { cn } from '@/lib/utils';
import { getVibeColor } from '@/utils/getVibeColor';
import type { Vibe } from '@/types';

interface VibeRingProps {
  vibe: Vibe;
  className?: string;
  children: React.ReactNode;
  pulse?: boolean;
}

export const VibeRing: React.FC<VibeRingProps> = ({
  vibe,
  className,
  children,
  pulse = false
}) => {
  // Convert HSL color to border class
  const vibeColorHsl = getVibeColor(vibe);
  
  return (
    <div 
      className={cn(
        "rounded-full border-2 transition-all",
        pulse && "animate-pulse",
        className
      )}
      style={{
        borderColor: `hsl(var(--${vibe}))`
      }}
    >
      {children}
    </div>
  );
};