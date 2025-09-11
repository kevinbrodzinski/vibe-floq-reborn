import { cn } from '@/lib/utils';

interface ScrollableChipContainerProps {
  children: React.ReactNode;
  className?: string;
  preventOverlap?: boolean;
}

/**
 * Container for horizontally scrollable chips with proper spacing and no overlap
 * Prevents FAB and navigation overlap by using safe-area padding
 */
export function ScrollableChipContainer({ 
  children, 
  className,
  preventOverlap = true 
}: ScrollableChipContainerProps) {
  return (
    <div className={cn(
      "fixed left-0 right-0 z-[590]",
      preventOverlap && "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
      className
    )}>
      <div className="mx-4 relative">
        <div className="overflow-x-auto overscroll-x-contain no-scrollbar snap-x">
          <div className="flex items-center gap-2 px-1 py-1 min-h-[40px] bg-[color:var(--bg-alt)]/80 backdrop-blur-sm border border-[color:var(--border)] rounded-kit-lg">
            {children}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent" />
      </div>
    </div>
  );
}