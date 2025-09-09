import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";
import { useFieldData } from "@/components/screens/field/FieldDataProvider";

interface VenuesChipProps {
  onOpen: () => void;
}

export function VenuesChip({ onOpen }: VenuesChipProps) {
  const fieldData = useFieldData();
  const venueCount = fieldData.nearbyVenues?.length ?? 0;
  
  const { handlers } = useAdvancedGestures({
    onSwipeUp: onOpen,
    onTap: onOpen,
  });

  if (venueCount === 0) return null;

  return (
    <button
      className="venues-chip bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium 
                 px-4 py-2 rounded-full transition-all duration-200 active:scale-95 touch-none
                 shadow-lg backdrop-blur-sm"
      aria-label={`${venueCount} nearby venues`}
      onClick={onOpen}
      {...handlers}
    >
      {venueCount} venue{venueCount > 1 ? 's' : ''} nearby ↑
    </button>
  );
}