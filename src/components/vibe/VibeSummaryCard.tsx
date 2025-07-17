import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VIBE_COLORS, type VibeEnum } from "@/constants/vibes";
import type { Vibe } from "@/types";
import isEqual from 'react-fast-compare';
import { useVibe } from "@/lib/store/useVibe";

interface VibeSummaryCardProps {
  currentVibe: Vibe;
  nearbyUsersCount: number;
  walkableFloqsCount: number;
  onOpenVibeSelector: () => void;
  isLocationReady?: boolean;
  updating?: boolean;
  error?: string | null;
}

export const VibeSummaryCard = memo(({
  currentVibe,
  nearbyUsersCount,
  walkableFloqsCount,
  onOpenVibeSelector,
  isLocationReady = true,
  updating = false,
  error = null
}: VibeSummaryCardProps) => {
  const [shouldPulse, setShouldPulse] = useState(false);
  const visibility = useVibe((s) => s.visibility);

  // Trigger pulse animation when vibe changes
  useEffect(() => {
    if (currentVibe) {
      setShouldPulse(true);
      const timer = setTimeout(() => setShouldPulse(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentVibe]);

  const vibeColor = currentVibe ? VIBE_COLORS[currentVibe as VibeEnum] : 'hsl(var(--muted))';

  // Hide vibe display when visibility is 'off'
  if (visibility === 'off') {
    return (
      <div className="bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg p-3">
        <div className="flex items-center justify-center py-2">
          <span className="text-xs text-muted-foreground opacity-60">Vibe hidden</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg p-3">
      {/* Vibe Section */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          Vibe {visibility === 'friends' && <span className="opacity-60">(friends only)</span>}
        </span>
        <motion.button
          onClick={onOpenVibeSelector}
          className="relative px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: `${vibeColor}15`,
            borderColor: `${vibeColor}30`,
            color: vibeColor
          }}
          animate={shouldPulse ? {
            boxShadow: [
              `0 0 0 0 ${vibeColor}30`,
              `0 0 0 8px ${vibeColor}00`,
              `0 0 0 0 ${vibeColor}00`
            ]
          } : {}}
          transition={{ duration: 0.5 }}
        >
          {currentVibe || 'None'}
        </motion.button>
      </div>

      {/* Stats */}
      <div className="text-xs text-muted-foreground">
        {nearbyUsersCount} nearby • {walkableFloqsCount} floqs
      </div>

      {/* Status indicators */}
      {updating && (
        <div className="text-xs text-primary animate-pulse mt-1">Updating...</div>
      )}
      {error && (
        <div className="text-xs text-destructive mt-1">{error}</div>
      )}
    </div>
  );
}, isEqual);

VibeSummaryCard.displayName = 'VibeSummaryCard';