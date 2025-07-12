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
    <button
      className="venues-chip hover:bg-primary/90 text-sm font-medium 
                 transition-all duration-200 active:scale-95 touch-none"
      aria-label={`${venueCount} nearby venues`}
      onClick={onOpen}
      {...handlers}
    >
      {venueCount} venue{venueCount > 1 ? 's' : ''} nearby ↑
    </button>
  );
}