import { Badge } from "@/components/ui/badge";
import { useDebug } from "@/lib/useDebug";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import type { Vibe } from "@/types";

interface FieldOverlayProps {
  isLocationReady: boolean;
  currentVibe: Vibe;
  nearbyUsersCount: number;
  walkableFloqsCount: number;
  updating: boolean;
  error: string | null;
  debug: boolean;
  onVibeChange: (vibe: Vibe) => void;
  children?: React.ReactNode;
}

export const FieldOverlay = ({
  isLocationReady,
  currentVibe,
  nearbyUsersCount,
  walkableFloqsCount,
  updating,
  error,
  debug,
  onVibeChange,
  children
}: FieldOverlayProps) => {
  const changeVibe = () => {
    const vibes: Vibe[] = ['social', 'chill', 'hype', 'flowing', 'open'];
    const currentIndex = vibes.indexOf(currentVibe);
    const nextVibe = vibes[(currentIndex + 1) % vibes.length];
    onVibeChange(nextVibe);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Debug counter */}
      {debug && (
        <div className="absolute top-2 right-2 z-30 text-xs opacity-60 bg-black/20 px-2 py-1 rounded pointer-events-auto">
          {nearbyUsersCount} people • {walkableFloqsCount} floqs ≤ 1 km
        </div>
      )}


      {/* Controls Region - Right center column */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
        {children}
      </div>
    </div>
  );
};