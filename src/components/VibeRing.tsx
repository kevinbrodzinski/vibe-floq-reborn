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
      style={{ ['--ring-color' as any]: hsl }}
      className={cn(
        'rounded-xl border p-2',
        'border-[color:var(--ring-color)]',
        pulse && 'animate-pulse',
        '[@media(prefers-reduced-motion:reduce)]:animate-none',
        className
      )}
      data-vibe={vibe}
    >
      {children}
    </div>
  );
}