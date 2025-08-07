import React, { memo, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_RGB, VibeEnum, type Vibe } from '@/constants/vibes';
import { VIBE_DESCRIPTIONS } from '@/constants/vibeDescriptions';
import { RingGradient } from './ConicGradientRing';
import { useCompatGlow } from '@/hooks/useCompatGlow';
import { weightedHue, blendHue } from '@/utils/color';
import { calculateVibeMatch, getUserVibeDistribution, getEventVibeDistribution } from '@/utils/vibeMatch';

// Web-compatible haptics helper
const triggerHaptic = () => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch (error) {
    // Silently fail on unsupported browsers
  }
};

/* ---------- constants ---------- */
const RADIUS = 140;                                    // Circle radius
const ORB_RADIUS = 18;                                // Orb radius  
const SEGMENT = 360 / VIBE_ORDER.length;             // 40° per segment

/* ---------- pulse animation ---------- */
const PULSE_ANIMATION = {
  scale: [1, 1.12, 1],
  transition: { 
    duration: 6, 
    repeat: Infinity, 
    ease: "easeInOut" as const
  },
};

interface VibeWheelProps {
  eventVibeData?: {
    crowdData?: Array<{ vibe: string }>;
    eventTags?: string[];
    dominantVibe?: string;
  };
  userPreferences?: Record<string, number>;
}

export const VibeWheel = memo<VibeWheelProps>(({ 
  eventVibeData, 
  userPreferences = {} 
}) => {
  const { vibe: current, setVibe } = useVibe();
  const { strength, hue } = useCompatGlow();

  /* ---------- vibe match calculation ---------- */
  const vibeMatch = useMemo(() => {
    if (!eventVibeData) return null;
    
    const userVibeCounts = getUserVibeDistribution(current, []);
    const eventVibeCounts = getEventVibeDistribution(
      eventVibeData.crowdData || [],
      eventVibeData.eventTags || [],
      eventVibeData.dominantVibe
    );
    
    return calculateVibeMatch(userVibeCounts, eventVibeCounts, userPreferences);
  }, [current, eventVibeData, userPreferences]);

  /* ---------- dynamic color calculation ---------- */
  const dynamicColor = useMemo(() => {
    if (vibeMatch) {
      // Use blended color from vibe match
      return vibeMatch.blendedColor;
    }
    
    // Fallback to current vibe color
    const currentVibeRGB = VIBE_RGB[current ?? 'chill'];
    return `rgb(${currentVibeRGB.join(',')})`;
  }, [vibeMatch, current]);

  /* ---------- motion values ---------- */
  const orbAngle = useMotionValue(VIBE_ORDER.indexOf(current as Vibe ?? 'chill') * SEGMENT);
  
  /* ---------- derived orb position ---------- */
  const orbX = useTransform(orbAngle, (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180; // -90 so 0° is at top
    return Math.cos(rad) * (RADIUS - ORB_RADIUS - 10); // 10px padding from edge
  });
  
  const orbY = useTransform(orbAngle, (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return Math.sin(rad) * (RADIUS - ORB_RADIUS - 10);
  });

  /* ---------- commit vibe change ---------- */
  const commitVibe = useCallback((v: Vibe) => {
    if (v === current) return;
    triggerHaptic();
    setVibe(v as VibeEnum);
  }, [current, setVibe]);

  /* ---------- sync orb position when vibe changes externally ---------- */
  React.useEffect(() => {
    const targetAngle = VIBE_ORDER.indexOf(current as Vibe ?? 'chill') * SEGMENT;
    if (Math.abs(orbAngle.get() - targetAngle) > 1) {
      orbAngle.set(targetAngle);
    }
  }, [current, orbAngle]);

  /* ---------- orb drag handlers ---------- */
  const handleOrbDragEnd = useCallback((_: any, info: PanInfo) => {
    // Simplified drag logic for better performance
    const { velocity, offset } = info;
    const currentAngle = orbAngle.get();
    
    // Calculate drag direction based on velocity (primary) and offset (fallback)
    let dragDirection = 0;
    if (Math.abs(velocity.x) > 50 || Math.abs(velocity.y) > 50) {
      // Use velocity for fast drags
      dragDirection = velocity.x > 0 ? 1 : -1;
    } else if (Math.abs(offset.x) > 20 || Math.abs(offset.y) > 20) {
      // Use offset for slow drags
      dragDirection = offset.x > 0 ? 1 : -1;
    } else {
      // No significant drag, stay in place
      return;
    }
    
    // Calculate how many segments to move (1-3 based on drag intensity)
    const dragIntensity = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const segmentsToMove = Math.max(1, Math.min(3, Math.floor(dragIntensity / 200)));
    
    // Calculate new angle
    let newAngle = currentAngle + (dragDirection * SEGMENT * segmentsToMove);
    
    // Normalize angle to 0-360 range
    newAngle = ((newAngle % 360) + 360) % 360;
    
    // Snap to nearest segment
    const snappedAngle = Math.round(newAngle / SEGMENT) * SEGMENT;
    
    // Smooth animation to new position
    orbAngle.set(snappedAngle);
    
    // Update vibe selection
    const vibeIndex = Math.round(snappedAngle / SEGMENT) % VIBE_ORDER.length;
    commitVibe(VIBE_ORDER[vibeIndex]);
  }, [orbAngle, commitVibe]);

  return (
    <div 
      className="relative w-[280px] h-[280px] mx-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Cross-platform gradient ring with dynamic color */}
      <RingGradient 
        mode="rainbow" 
        singleColor={dynamicColor}
        size={280}
        strokeWidth={6}
      />
      
      {/* Vibe labels around the circle - positioned to align with ring segments */}
      {VIBE_ORDER.map((vibe, index) => {
        const angle = index * SEGMENT - 90; // -90 to start at top
        const radian = (angle * Math.PI) / 180;
        const labelRadius = 105; // Slightly further out to clear the ring
        const x = Math.cos(radian) * labelRadius;
        const y = Math.sin(radian) * labelRadius;
        const isSelected = vibe === current;
        
        return (
          <div
            key={vibe}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              left: RADIUS + x - 30, // center + offset - half width
              top: RADIUS + y - 12,  // center + offset - half height
              width: 60,
              height: 24,
            }}
          >
            <span
              className="text-xs font-medium capitalize select-none text-center"
              style={{
                color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
                fontWeight: isSelected ? '600' : '500',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {vibe}
            </span>
          </div>
        );
      })}
      
      {/* Center content with vibe name and description - non-blocking */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ pointerEvents: 'none' }}
      >
        <div className="relative flex flex-col items-center justify-center text-center">
          {/* Dynamic glow background */}
          <div
            className="absolute w-[120px] h-[120px] rounded-full blur-2xl opacity-30 transition-colors duration-500"
            style={{ backgroundColor: dynamicColor }}
          />

          {/* Vibe label */}
          <div className="relative z-10 text-3xl font-bold capitalize text-white">
            {current ?? 'SELECT'}
          </div>

          {/* Description */}
          {current && (
            <p className="relative z-10 text-sm text-white/70 font-medium mt-1 max-w-[160px] text-center">
              {VIBE_DESCRIPTIONS[current]}
            </p>
          )}

          {/* Vibe match percentage */}
          {vibeMatch && (
            <div className="relative z-10 text-[10px] text-white/80 mt-1 font-light">
              Match: {Math.round(vibeMatch.matchPercentage)}%
            </div>
          )}

          {/* Confidence percentage */}
          {strength > 0 && !vibeMatch && (
            <div className="relative z-10 text-[10px] text-white/60 mt-1 font-light">
              Confidence: {Math.round(strength * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Draggable mood orb with pulse animation */}
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={false}
        onDragEnd={handleOrbDragEnd}
        animate={PULSE_ANIMATION}
        className="absolute rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-colors duration-500"
        style={{
          width: ORB_RADIUS * 2,
          height: ORB_RADIUS * 2,
          x: orbX,
          y: orbY,
          left: RADIUS,
          top: RADIUS,
          backgroundColor: dynamicColor,
          border: '3px solid rgba(255,255,255,0.8)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
        whileHover={{ scale: 1.1 }}
        whileDrag={{ scale: 1.2, zIndex: 10 }}
        role="slider"
        aria-valuetext={current ?? 'unset'}
        aria-label={`Current vibe: ${current}. Drag to change.`}
        tabIndex={0}
      />
    </div>
  );
});