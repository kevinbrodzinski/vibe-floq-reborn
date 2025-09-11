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
      <div className="mx-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-fit bg-[color:var(--bg-alt)]/80 backdrop-blur-sm border border-[color:var(--border)] rounded-kit-lg px-3 py-2">
          {children}
        </div>
      </div>
    </div>
  );
}