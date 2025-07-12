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
      className="venues-chip"
      {...handlers}
    >
      <button
        className="bg-primary text-primary-foreground px-4 py-2 
                   rounded-full text-sm font-medium shadow-lg 
                   hover:bg-primary/90 transition-all duration-200
                   active:scale-95 touch-none"
      >
        {venueCount} venue{venueCount > 1 ? 's' : ''} nearby ↑
      </button>
    </div>
  );
}