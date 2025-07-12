import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";

interface VenuesChipProps {
  onOpen: () => void;
  venueCount?: number;
}

export function VenuesChip({ onOpen, venueCount = 1 }: VenuesChipProps) {
  const { handlers } = useAdvancedGestures({
    onSwipeUp: onOpen,
    onTap: onOpen,
  });

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-20"
      style={{ bottom: `calc(var(--mobile-nav-height, 75px) + 16px)` }}
      {...handlers}
    >
      <button
        className="bg-accent text-accent-foreground px-4 py-2 
                   rounded-full text-sm font-medium shadow-lg 
                   hover:bg-accent/90 transition-all duration-200
                   active:scale-95 touch-none"
      >
        {venueCount} venue{venueCount > 1 ? 's' : ''} nearby ↑
      </button>
    </div>
  );
}