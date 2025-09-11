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
  const hsl = getVibeColor(vibe); // "hsl(300 90% 60%)"
  return (
    <div
      style={{ ['--vibe-hsl' as any]: hsl }}
      className={cn(
        'relative rounded-xl ring-2 ring-[hsl(var(--vibe-hsl))] ring-offset-2 ring-offset-background',
        pulse ? 'motion-safe:animate-pulse' : '',
        className
      )}
      data-vibe={vibe}
    >
      {children}
    </div>
  );
}