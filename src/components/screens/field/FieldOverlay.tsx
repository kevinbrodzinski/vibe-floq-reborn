import { memo, useState } from "react";
import { useDebug } from "@/lib/useDebug";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { VibeSummaryCard } from "@/components/vibe/VibeSummaryCard";
import { VibeSelectionSheet } from "@/components/vibe/VibeSelectionSheet";
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
  const [vibeSheetOpen, setVibeSheetOpen] = useState(false);

  const openVibeSelector = () => {
    setVibeSheetOpen(true);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Debug counter */}
      {debug && (
        <div className="absolute top-2 right-2 text-xs opacity-60 bg-black/20 px-2 py-1 rounded pointer-events-auto" {...zIndex('overlay')}>
          {nearbyUsersCount} people • {walkableFloqsCount} floqs ≤ 1 km
        </div>
      )}


      {/* Status Region - Top left under header */}
      <div className="absolute top-28 left-4 pointer-events-auto min-h-[44px] max-w-[200px]" {...zIndex('overlay')}>
        <VibeSummaryCard
          currentVibe={currentVibe}
          nearbyUsersCount={nearbyUsersCount}
          walkableFloqsCount={walkableFloqsCount}
          onOpenVibeSelector={openVibeSelector}
          isLocationReady={isLocationReady}
          updating={updating}
          error={error}
        />
      </div>

      {/* Controls Region - Right center column */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto w-12" {...zIndex('uiInteractive')}>
        {children}
      </div>

      {/* Vibe Selection Sheet */}
      <VibeSelectionSheet
        open={vibeSheetOpen}
        onOpenChange={setVibeSheetOpen}
        currentVibe={currentVibe}
        onVibeSelect={onVibeChange}
      />
    </div>
  );
}, isEqual);

FieldOverlay.displayName = 'FieldOverlay';