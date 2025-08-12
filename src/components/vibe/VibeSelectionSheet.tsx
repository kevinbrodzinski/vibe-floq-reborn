import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { VIBES, VIBE_RGB, VIBE_COLORS, type Vibe } from '@/lib/vibes';
import { cn } from '@/lib/utils';

interface VibeSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVibe: Vibe;
  onVibeSelect: (vibe: Vibe) => void;
}

const vibeDescriptions: Record<Vibe, string> = {
  chill: "Relaxed and easygoing",
  flowing: "In the zone, going with the flow",
  romantic: "Looking for connection",
  hype: "High energy, ready to party",
  weird: "Quirky and unconventional",
  solo: "Enjoying some alone time",
  social: "Ready to meet people",
  open: "Open to new experiences",
  down: "Feeling low, need support",
  curious: "Eager to explore and learn",
};

export const VibeSelectionSheet = ({
  open,
  onOpenChange,
  currentVibe,
  onVibeSelect,
}: VibeSelectionSheetProps) => {
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);

  const handleVibeSelect = (vibe: Vibe) => {
    setSelectedVibe(vibe);
    // Add a small delay for visual feedback
    setTimeout(() => {
      onVibeSelect(vibe);
      onOpenChange(false);
      setSelectedVibe(null);
    }, 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] overflow-hidden">
        <SheetHeader className="text-center pb-6">
          <SheetTitle className="text-2xl font-light">Choose Your Vibe</SheetTitle>
          <SheetDescription>
            Select how you're feeling right now
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {VIBES.map((vibe) => {
            const isSelected = vibe === currentVibe;
            const isBeingSelected = vibe === selectedVibe;
            const vibeRgb = VIBE_RGB[vibe];
            const [r, g, b] = vibeRgb;
            const vibeColor = `rgb(${r}, ${g}, ${b})`;

            return (
              <motion.button
                key={vibe}
                onClick={() => handleVibeSelect(vibe)}
                className={cn(
                  "relative p-6 rounded-2xl border-2 transition-all duration-200",
                  "bg-background/50 backdrop-blur-sm",
                  "hover:scale-105 active:scale-95",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: VIBES.indexOf(vibe) * 0.05 }}
              >
                {/* Glow effect */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-20 blur-xl"
                  style={{
                    backgroundColor: vibeColor,
                    opacity: isSelected ? 0.3 : isBeingSelected ? 0.4 : 0.1,
                  }}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  {/* Vibe orb */}
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white/20 shadow-lg"
                    style={{
                      backgroundColor: vibeColor,
                      boxShadow: `0 4px 20px ${vibeColor}40`,
                    }}
                  />

                  {/* Vibe name */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold capitalize text-foreground">
                      {vibe}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {vibeDescriptions[vibe]}
                    </p>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute -top-2 -right-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center"
                        style={{ backgroundColor: vibeColor }}
                      >
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Loading indicator for selected vibe */}
                  {isBeingSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Current vibe indicator */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          Current vibe: <span className="font-medium capitalize">{currentVibe}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
};