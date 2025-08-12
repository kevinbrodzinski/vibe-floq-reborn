import { useState, useEffect } from 'react';
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
  const [animationTime, setAnimationTime] = useState(0);

  // Slow moving animation for gradients
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationTime((prev) => (prev + 1) % 360);
    }, 100); // Update every 100ms for smooth but slow movement

    return () => clearInterval(interval);
  }, []);

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
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="text-center pb-4 flex-shrink-0">
          <SheetTitle className="text-xl sm:text-2xl font-light">Choose Your Vibe</SheetTitle>
          <SheetDescription className="text-sm">
            Select how you're feeling right now
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-sm sm:max-w-lg mx-auto px-2 pb-4">
          {VIBES.map((vibe) => {
            const isSelected = vibe === currentVibe;
            const isBeingSelected = vibe === selectedVibe;
            const vibeRgb = VIBE_RGB[vibe];
            const [r, g, b] = vibeRgb;
            const vibeColor = `rgb(${r}, ${g}, ${b})`;
            
            // Create animated gradient
            const gradientAngle = (animationTime + VIBES.indexOf(vibe) * 36) % 360; // Different phase for each vibe
            const lighterColor = `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`;
            const darkerColor = `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;

            return (
              <motion.button
                key={vibe}
                onClick={() => handleVibeSelect(vibe)}
                className="relative p-3 sm:p-6 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 bg-transparent"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: VIBES.indexOf(vibe) * 0.05 }}
              >
                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-4">
                  {/* Large animated vibe orb - responsive sizing */}
                  <div className="relative">
                    <div
                      className="w-14 h-14 sm:w-20 sm:h-20 rounded-full shadow-lg sm:shadow-2xl transition-all duration-300"
                      style={{
                        background: `linear-gradient(${gradientAngle}deg, ${vibeColor}, ${lighterColor}, ${vibeColor}, ${darkerColor})`,
                        boxShadow: `0 4px 16px ${vibeColor}60, 0 0 0 ${isSelected ? '3px' : '0px'} ${vibeColor}40`,
                        transform: isBeingSelected ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                    
                    {/* Selected indicator - responsive sizing */}
                    {isSelected && (
                      <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1">
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-background flex items-center justify-center shadow-lg"
                          style={{ backgroundColor: vibeColor }}
                        >
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
                        </div>
                      </div>
                    )}

                    {/* Loading indicator for selected vibe - responsive sizing */}
                    {isBeingSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Vibe name - responsive text sizing */}
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-semibold capitalize text-foreground">
                      {vibe}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 max-w-[100px] sm:max-w-[120px] leading-tight">
                      {vibeDescriptions[vibe]}
                    </p>
                  </div>
                </div>

                {/* Subtle glow effect */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-10 blur-xl transition-opacity duration-300"
                  style={{
                    backgroundColor: vibeColor,
                    opacity: isSelected ? 0.2 : isBeingSelected ? 0.3 : 0.05,
                  }}
                />
              </motion.button>
            );
          })}
          </div>
          
          {/* Current vibe indicator - mobile optimized */}
          <div className="text-center mt-4 sm:mt-6 text-xs sm:text-sm text-muted-foreground px-4 pb-4">
            Current vibe: <span className="font-medium capitalize">{currentVibe}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};