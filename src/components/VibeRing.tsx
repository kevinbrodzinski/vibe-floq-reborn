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

export function VibeRing({ vibe, pulse=false, className, children }: VibeRingProps) {
  const hsl = getVibeColor(vibe); // ex: "hsl(300 90% 60%)"

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        'border-2',
        pulse && 'motion-safe:animate-pulse-soft',
        className
      )}
      style={{ borderColor: `color-mix(in oklab, ${hsl} 85%, transparent)` }}
    >
      {children}
    </div>
  );
}