import * as React from "react";
import { FloqCard, FloqCardItem } from "./cards/FloqCard";
import { useFloqNavigation } from "@/hooks/useFloqNavigation";
import { useTouchGestures } from "@/hooks/useTouchGestures";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { cn } from "@/lib/utils";

interface FloqCarouselProps {
  items: FloqCardItem[];
  kind: "tribe" | "discover" | "public" | "momentary";
  onNavigate?: (floqId: string) => void;
}

export function FloqCarousel({ items, kind, onNavigate }: FloqCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  
  // Enhanced navigation with keyboard shortcuts
  useFloqNavigation({ floqs: items, onNavigate });
  
  // Keyboard navigation within carousel
  const { handleKeyDown } = useKeyboardNavigation({
    itemCount: items.length,
    onSelect: (index) => setCurrentIndex(index),
    loop: true
  });

  // Touch gestures for mobile
  const touchBind = useTouchGestures({
    onSwipeLeft: () => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        scrollToIndex(currentIndex + 1);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        scrollToIndex(currentIndex - 1);
      }
    }
  });

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.scrollWidth / items.length;
    scrollRef.current.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
  };

  // Auto-scroll to keep current card centered
  React.useEffect(() => {
    scrollToIndex(currentIndex);
  }, [currentIndex]);

  return (
    <div className="w-full" onKeyDown={handleKeyDown} tabIndex={0}>
      <div 
        ref={scrollRef}
        className={cn(
          "flex gap-4 overflow-x-auto pb-4",
          "scrollbar-hide snap-x snap-mandatory",
          kind === "momentary" && "pl-4"
        )}
        {...touchBind()}
      >
        {items.map((item, index) => (
          <div 
            key={item.id} 
            className={cn(
              "flex-shrink-0 snap-start",
              index === currentIndex && "ring-2 ring-primary ring-offset-2"
            )}
          >
            <FloqCard item={item} kind={kind} />
          </div>
        ))}
      </div>
      
      {/* Navigation dots for momentary cards */}
      {kind === "momentary" && items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex 
                  ? "bg-primary scale-125" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
