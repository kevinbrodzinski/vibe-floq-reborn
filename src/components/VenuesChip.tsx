
import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";

interface VenuesChipProps {
  onOpen: () => void;
  venueCount?: number;
}

export function VenuesChip({ onOpen, venueCount = 1 }: VenuesChipProps) {
  const { handlers } = useAdvancedGestures({
    onSwipeUp: () => {
      console.log('VenuesChip: swipe up detected')
      onOpen()
    },
    onTap: () => {
      console.log('VenuesChip: tap detected')
      onOpen()
    },
  });

  const handleClick = () => {
    console.log('VenuesChip: click handler called')
    onOpen()
  }

  return (
    <button
      className="venues-chip hover:bg-primary/90 text-sm font-medium 
                 transition-all duration-200 active:scale-95 touch-none"
      aria-label={`${venueCount} nearby venues`}
      onClick={handleClick}
      {...handlers}
    >
      {venueCount} venue{venueCount > 1 ? 's' : ''} nearby ↑
    </button>
  );
}
