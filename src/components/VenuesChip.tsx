import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";

interface VenuesChipProps {
  onClick: () => void;
  venueCount?: number;
}

export function VenuesChip({ onClick, venueCount = 1 }: VenuesChipProps) {
  const { handlers } = useAdvancedGestures({
    onSwipeUp: onClick,
    onTap: onClick,
  });

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20"
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