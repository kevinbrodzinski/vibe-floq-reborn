import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, CircleOff, Zap, Activity, Coffee, Users, Heart, Brain, Sparkles } from 'lucide-react';
import { useVibe } from '@/lib/store/useVibe';
import { useMotionBasedVibe } from '@/hooks/useMotionBasedVibe';
import { useBatteryOptimizedDbMeter } from '@/hooks/useBatteryOptimizedDbMeter';
import { VIBE_ORDER, VIBE_RGB } from '@/constants/vibes';
import { cn } from '@/lib/utils';

interface DynamicVibeToggleProps {
  className?: string;
  showMotionData?: boolean;
  showDbData?: boolean;
}

const vibeIcons = {
  hype: Sparkles,
  social: Users,
  chill: Coffee,
  flowing: Activity,
  open: Brain,
  curious: Zap,
  solo: Radio,
  romantic: Heart,
  weird: Sparkles,
  down: CircleOff
};

export const DynamicVibeToggle: React.FC<DynamicVibeToggleProps> = ({
  className = '',
  showMotionData = true,
  showDbData = true
}) => {
  const { vibe: currentVibe, setVibe } = useVibe();
  const { motionData, vibeTransitions, activity, speed, confidence } = useMotionBasedVibe(false); // Disabled by default
  const { dbState, currentLevel, getVibeInfluence } = useBatteryOptimizedDbMeter();

  const [isExpanded, setIsExpanded] = useState(false);
  const [lastVibeChange, setLastVibeChange] = useState<number>(0);

  // Get current vibe position
  const getVibePosition = (vibe: string) => {
    const index = VIBE_ORDER.indexOf(vibe as any);
    return index >= 0 ? index : 0;
  };

  // Get vibe color
  const getVibeColor = (vibe: string) => {
    const rgb = VIBE_RGB[vibe as keyof typeof VIBE_RGB];
    return rgb ? `rgb(${rgb.join(', ')})` : '#666';
  };

  // Get motion-based animation properties
  const getMotionAnimation = () => {
    if (!motionData.isMoving) {
      return { scale: 1, rotate: 0 };
    }

    const baseScale = 1 + (speed / 10); // Scale based on speed
    const rotation = speed > 5 ? [0, 5, -5, 0] : [0, 2, -2, 0];

    return {
      scale: baseScale,
      rotate: rotation,
      transition: {
        duration: 0.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    };
  };

  // Get dB-based animation properties
  const getDbAnimation = () => {
    const influence = getVibeInfluence();
    const intensity = currentLevel / 120; // Normalize to 0-1

    return {
      scale: 1 + (intensity * 0.2),
      filter: `brightness(${1 + (intensity * 0.3)})`,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    };
  };

  // Handle vibe change
  const handleVibeChange = (newVibe: string) => {
    setVibe(newVibe as any);
    setLastVibeChange(Date.now());
  };

  // Auto-expand on vibe change
  useEffect(() => {
    if (vibeTransitions.length > 0) {
      setIsExpanded(true);
      const timer = setTimeout(() => setIsExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [vibeTransitions]);

  const currentPosition = getVibePosition(currentVibe);
  const currentColor = getVibeColor(currentVibe);
  const CurrentIcon = vibeIcons[currentVibe as keyof typeof vibeIcons] || Radio;

  return (
    <div className={cn("relative", className)}>
      {/* Main Toggle Button */}
      <motion.div
        className="relative"
        animate={getMotionAnimation()}
      >
        <motion.button
          className={cn(
            "relative w-16 h-16 rounded-full border-2 border-white/20",
            "flex items-center justify-center",
            "bg-gradient-to-br from-background/80 to-background/40",
            "backdrop-blur-xl shadow-lg",
            "transition-all duration-300",
            "hover:scale-105 active:scale-95"
          )}
          style={{
            backgroundColor: `${currentColor}20`,
            borderColor: currentColor
          }}
          onClick={() => setIsExpanded(!isExpanded)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={getDbAnimation()}
        >
          {/* Vibe Icon */}
          <motion.div
            key={currentVibe}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-white"
          >
            <CurrentIcon className="w-6 h-6" />
          </motion.div>

          {/* Motion Indicator */}
          {motionData.isMoving && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}

          {/* dB Indicator */}
          {dbState.isActive && (
            <motion.div
              className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.button>
      </motion.div>

      {/* Expanded Vibe Options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-4"
          >
            <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30 shadow-xl">
              {/* Vibe Options Grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {VIBE_ORDER.map((vibe) => {
                  const Icon = vibeIcons[vibe as keyof typeof vibeIcons] || Radio;
                  const isActive = vibe === currentVibe;
                  const color = getVibeColor(vibe);

                  return (
                    <motion.button
                      key={vibe}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        "transition-all duration-200",
                        isActive
                          ? "ring-2 ring-white shadow-lg"
                          : "hover:bg-white/10"
                      )}
                      style={{
                        backgroundColor: isActive ? `${color}40` : 'transparent',
                        borderColor: isActive ? color : 'transparent'
                      }}
                      onClick={() => handleVibeChange(vibe)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/70")} />
                    </motion.button>
                  );
                })}
              </div>

              {/* Motion Data */}
              {showMotionData && (
                <div className="space-y-2 text-xs text-white/80">
                  <div className="flex items-center justify-between">
                    <span>Activity:</span>
                    <span className="font-medium capitalize">{activity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Speed:</span>
                    <span className="font-medium">{speed.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Confidence:</span>
                    <span className="font-medium">{(confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}

              {/* dB Data */}
              {showDbData && dbState.isActive && (
                <div className="mt-3 pt-3 border-t border-white/20 space-y-2 text-xs text-white/80">
                  <div className="flex items-center justify-between">
                    <span>Sound Level:</span>
                    <span className="font-medium">{currentLevel.toFixed(0)} dB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Environment:</span>
                    <span className="font-medium capitalize">{getVibeInfluence()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Battery Mode:</span>
                    <span className="font-medium text-green-400">Optimized</span>
                  </div>
                </div>
              )}

              {/* Recent Transitions */}
              {vibeTransitions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/20">
                  <div className="text-xs text-white/60 mb-2">Recent Changes:</div>
                  <div className="space-y-1">
                    {vibeTransitions.slice(-3).map((transition, index) => (
                      <div key={index} className="text-xs text-white/70">
                        <span className="capitalize">{transition.from}</span>
                        <span className="mx-1">→</span>
                        <span className="capitalize font-medium">{transition.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 