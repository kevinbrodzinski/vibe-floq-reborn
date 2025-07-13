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
    <div className="absolute inset-0 pointer-events-auto">
      {/* Debug counter */}
      {debug && (
        <div className="absolute top-2 right-2 z-30 text-xs opacity-60 bg-black/20 px-2 py-1 rounded pointer-events-none">
          {nearbyUsersCount} people • {walkableFloqsCount} floqs ≤ 1 km
        </div>
      )}

      {/* Time Status - Centered above status region */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <TimeStatusIndicator />
      </div>

      {/* Status Region - Top left under header */}
      <div className="absolute top-28 left-4 z-20 pointer-events-auto min-h-[44px]">
        <div className="bg-card/90 backdrop-blur-sm border border-border/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isLocationReady ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isLocationReady ? 'Location Active' : 'Getting Location...'}
            </span>
          </div>
          {currentVibe && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Vibe:</span>
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-primary/10 pointer-events-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
                onClick={changeVibe}
              >
                {currentVibe}
              </Badge>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {nearbyUsersCount} nearby • {walkableFloqsCount} floqs
          </div>
          {updating && <div className="text-xs text-primary animate-pulse">Updating...</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
      </div>

      {/* Controls Region - Right center column */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-auto">
        {children}
      </div>
    </div>
  );
};