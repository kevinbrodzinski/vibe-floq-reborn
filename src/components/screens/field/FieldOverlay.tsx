import { memo, useMemo } from "react";
import { useDebug } from "@/lib/useDebug";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { VibeSummaryCard } from "@/components/vibe/VibeSummaryCard";
import type { Vibe } from "@/types";
import isEqual from 'react-fast-compare';
import { zIndex } from "@/constants/z";

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

export const FieldOverlay = memo(({
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
  // Memoize vibe cycling to prevent recreation on every render
  const changeVibe = useMemo(() => () => {
    const vibes: Vibe[] = ['social', 'chill', 'hype', 'flowing', 'open'];
    const currentIndex = vibes.indexOf(currentVibe);
    const nextVibe = vibes[(currentIndex + 1) % vibes.length];
    onVibeChange(nextVibe);
  }, [currentVibe, onVibeChange]);

  return (
    <div className="absolute inset-0 pointer-events-auto">
      {/* Debug counter */}
      {debug && (
        <div className="absolute top-2 right-2 text-xs opacity-60 bg-black/20 px-2 py-1 rounded pointer-events-none" style={zIndex('overlay')}>
          {nearbyUsersCount} people • {walkableFloqsCount} floqs ≤ 1 km
        </div>
      )}

      {/* Time Status - Centered above status region */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none" style={zIndex('uiInteractive')}>
        <TimeStatusIndicator />
      </div>

      {/* Status Region - Top left under header */}
      <div className="absolute top-28 left-4 pointer-events-auto min-h-[44px]" style={zIndex('overlay')}>
        <VibeSummaryCard
          currentVibe={currentVibe}
          nearbyUsersCount={nearbyUsersCount}
          walkableFloqsCount={walkableFloqsCount}
          onOpenVibeSelector={changeVibe}
          isLocationReady={isLocationReady}
          updating={updating}
          error={error}
        />
      </div>

      {/* Controls Region - Right center column */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto" style={zIndex('uiInteractive')}>
        {children}
      </div>
    </div>
  );
}, isEqual);

FieldOverlay.displayName = 'FieldOverlay';