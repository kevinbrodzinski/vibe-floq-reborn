import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselIndicatorsProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

export function CarouselIndicators({ scrollRef, className }: CarouselIndicatorsProps) {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollability = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    setCanScrollLeft(element.scrollLeft > 0);
    setCanScrollRight(
      element.scrollLeft < element.scrollWidth - element.clientWidth
    );
  }, [scrollRef]);

  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Check initial state
    checkScrollability();

    // Listen for scroll events
    element.addEventListener("scroll", checkScrollability);
    
    // Listen for resize events
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", checkScrollability);
      resizeObserver.disconnect();
    };
  }, [checkScrollability]);

  if (!canScrollLeft && !canScrollRight) return null;

  return (
    <div className={cn("flex items-center justify-center gap-1 py-2", className)}>
      <div
        className={cn(
          "w-2 h-2 rounded-full transition-colors",
          canScrollLeft ? "bg-primary" : "bg-muted"
        )}
      />
      <ChevronLeft
        className={cn(
          "w-4 h-4 transition-opacity",
          canScrollLeft ? "opacity-100" : "opacity-30"
        )}
      />
      <div className="text-xs text-muted-foreground px-2">
        Swipe for more
      </div>
      <ChevronRight
        className={cn(
          "w-4 h-4 transition-opacity",
          canScrollRight ? "opacity-100" : "opacity-30"
        )}
      />
      <div
        className={cn(
          "w-2 h-2 rounded-full transition-colors",
          canScrollRight ? "bg-primary" : "bg-muted"
        )}
      />
    </div>
  );
}