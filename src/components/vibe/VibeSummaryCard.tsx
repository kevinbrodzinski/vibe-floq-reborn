import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { VIBE_COLORS, type VibeEnum } from '@/constants/vibes';
import { safeVibe } from '@/types/enums/vibes';
import type { Vibe } from '@/types';
import { useVibe } from '@/lib/store/useVibe';       
import { shallow } from 'zustand/shallow';


interface VibeSummaryCardProps {
  currentVibe: Vibe;
  nearbyUsersCount: number;
  walkableFloqsCount: number;
  onOpenVibeSelector: () => void;
  isLocationReady?: boolean;   // ← still here in case callers rely on it
  updating?: boolean;
  error?: string | null;
}

export const VibeSummaryCard = memo(
  ({
    currentVibe,
    nearbyUsersCount,
    walkableFloqsCount,
    onOpenVibeSelector,
    isLocationReady = true,
    updating = false,
    error = null,
  }: VibeSummaryCardProps) => {
    const [shouldPulse, setShouldPulse] = useState(false);
    const visibility = useVibe((s) => s.visibility);

    /* ---- pulse when vibe changes --------------------------------- */
    useEffect(() => {
      if (currentVibe) {
        setShouldPulse(true);
        const t = setTimeout(() => setShouldPulse(false), 500);
        return () => clearTimeout(t);
      }
    }, [currentVibe]);

    const vibeColor = currentVibe
      ? VIBE_COLORS[safeVibe(currentVibe)]
      : 'hsl(var(--muted))';

    /* ---- hidden state -------------------------------------------- */
    if (visibility === 'off') {
      return (
        <div className="bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg p-3">
          <div className="flex items-center justify-center py-2">
            <span className="text-xs text-muted-foreground opacity-60">
              Vibe hidden
            </span>
          </div>
        </div>
      );
    }

    /* ---- main card ----------------------------------------------- */
    return (
      <div className="bg-background/60 backdrop-blur-sm border border-border/20 rounded-lg p-3">
        {/* Vibe header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Vibe</span>
            {visibility === 'friends' && (
              <Badge variant="secondary" className="text-xs">
                Friends only
              </Badge>
            )}
          </div>

          <motion.button
            onClick={onOpenVibeSelector}
            className="relative px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: `${vibeColor}15`,
              borderColor: `${vibeColor}30`,
              color: vibeColor,
            }}
            animate={
              shouldPulse
                ? {
                    boxShadow: [
                      `0 0 0 0 ${vibeColor}30`,
                      `0 0 0 8px ${vibeColor}00`,
                      `0 0 0 0 ${vibeColor}00`,
                    ],
                  }
                : {}
            }
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
          <div className="text-xs text-primary animate-pulse mt-1">
            Updating…
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive mt-1">{error}</div>
        )}
      </div>
    );
  }
);

VibeSummaryCard.displayName = 'VibeSummaryCard';