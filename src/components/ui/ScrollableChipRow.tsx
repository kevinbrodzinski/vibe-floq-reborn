import * as React from 'react';
import { cn } from '@/lib/utils';

export function ScrollableChipRow({ children, className }: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/40 to-transparent rounded-l-xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/40 to-transparent rounded-r-xl" />
    </div>
  );
}