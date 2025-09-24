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
    console.log('commitVibe called:', { 
      newVibe: v, 
      currentVibe: current, 
      isEqual: v === current 
    });
    
    if (v === current) {
      console.log('Vibe unchanged, skipping update');
      return;
    }
    
    console.log('Committing vibe change:', current, '→', v);
    triggerHaptic();
    setVibe(v as VibeEnum);
  }, [current, setVibe]);

  /* ---------- sync orb position when vibe changes externally ---------- */
  React.useEffect(() => {
    if (!current) return;
    
    const vibeIndex = VIBE_ORDER.indexOf(current as Vibe);
    if (vibeIndex === -1) {
      console.warn('Unknown vibe:', current);
      return;
    }
    
    const targetAngle = vibeIndex * SEGMENT;
    const currentAngle = orbAngle.get();
    
    // Only update if there's a significant difference (avoid micro-updates)
    if (Math.abs(currentAngle - targetAngle) > 5) {
      console.log('Syncing orb to vibe:', current, 'angle:', targetAngle);
      orbAngle.set(targetAngle);
    }
  }, [current, orbAngle]);

  /* ---------- orb drag handlers ---------- */
  const handleOrbDrag = useCallback((_: any, info: PanInfo) => {
    // Real-time drag feedback - calculate angle from center
    const centerX = RADIUS;
    const centerY = RADIUS;
    const dragX = centerX + info.offset.x;
    const dragY = centerY + info.offset.y;
    
    // Calculate angle from center to drag position
    let angle = Math.atan2(dragY - centerY, dragX - centerX) * (180 / Math.PI);
    
    // Adjust angle to start from top (0° = top, clockwise)
    angle = (angle + 90 + 360) % 360;
    
    // Update orb position in real-time
    orbAngle.set(angle);
  }, [orbAngle]);

  const handleOrbDragEnd = useCallback((_: any, info: PanInfo) => {
    // Get the current angle from the drag
    const currentAngle = orbAngle.get();
    
    // Snap to the nearest vibe segment
    const snappedAngle = Math.round(currentAngle / SEGMENT) * SEGMENT;
    
    // Smooth snap animation
    orbAngle.set(snappedAngle);
    
    // Calculate which vibe this corresponds to
    const vibeIndex = Math.round(snappedAngle / SEGMENT) % VIBE_ORDER.length;
    const selectedVibe = VIBE_ORDER[vibeIndex];
    
    console.log('Drag ended:', {
      currentAngle,
      snappedAngle,
      vibeIndex,
      selectedVibe,
      totalVibes: VIBE_ORDER.length
    });
    
    // Update the vibe
    commitVibe(selectedVibe);
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
        onDrag={handleOrbDrag}
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