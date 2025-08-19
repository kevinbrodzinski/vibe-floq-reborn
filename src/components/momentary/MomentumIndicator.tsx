import * as React from 'react';
import { cn } from '@/lib/utils';

export type MomentumState = 'gaining' | 'steady' | 'winding';

export function MomentumIndicator({ state, className }: { state: MomentumState; className?: string }) {
  const label = state === 'gaining' ? 'Floq is gaining steam' : state === 'winding' ? 'Floq is winding down' : 'Floq is steady';
  return (
    <div className={cn('flex items-center gap-2 p-3', className)}>
      <div className="h-4 w-4 rounded-full bg-primary/70 animate-pulse" />
      <div className="text-sm">{label}</div>
    </div>
  );
}