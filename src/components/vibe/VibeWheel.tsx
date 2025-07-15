import React, { memo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_RGB, VibeEnum } from '@/constants/vibes';
import { RingGradient } from './RingGradient';

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

export const VibeWheel = memo(() => {
  const { vibe: current, setVibe } = useVibe();

  /* ---------- motion values ---------- */
  const orbAngle = useMotionValue(VIBE_ORDER.indexOf(current ?? 'chill') * SEGMENT);
  
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
  const commitVibe = useCallback((v: VibeEnum) => {
    if (v === current) return;
    triggerHaptic();
    setVibe(v);
  }, [current, setVibe]);

  /* ---------- sync orb position when vibe changes externally ---------- */
  React.useEffect(() => {
    const targetAngle = VIBE_ORDER.indexOf(current ?? 'chill') * SEGMENT;
    if (Math.abs(orbAngle.get() - targetAngle) > 1) {
      orbAngle.set(targetAngle);
    }
  }, [current, orbAngle]);

  /* ---------- orb drag handlers ---------- */
  const handleOrbDragEnd = useCallback((_: any, info: PanInfo) => {
    // Use velocity and offset to determine direction of drag
    const offset = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    
    // Calculate angle based on drag offset
    const currentAngle = orbAngle.get();
    const dragAngle = (info.offset.x > 0 ? 1 : -1) * Math.min(offset * 0.3, 120); // limit max rotation
    let newAngle = currentAngle + dragAngle;
    
    // Normalize angle
    while (newAngle < 0) newAngle += 360;
    while (newAngle >= 360) newAngle -= 360;
    
    // Snap to nearest segment
    const snappedAngle = Math.round(newAngle / SEGMENT) * SEGMENT;
    
    // Use spring for smooth snap
    orbAngle.set(snappedAngle);
    
    // Determine which vibe was selected
    const idx = ((Math.round(snappedAngle / SEGMENT) % VIBE_ORDER.length) + VIBE_ORDER.length) % VIBE_ORDER.length;
    commitVibe(VIBE_ORDER[idx]);
  }, [orbAngle, commitVibe]);

  /* ---------- current vibe color ---------- */
  const currentVibeRGB = VIBE_RGB[current ?? 'chill'];
  const currentColor = `rgb(${currentVibeRGB.join(',')})`;

  return (
    <div 
      className="relative w-[280px] h-[280px] mx-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Static gradient ring */}
      <RingGradient />
      
      {/* Vibe labels around the circle - static */}
      {VIBE_ORDER.map((vibe, index) => {
        const angle = index * SEGMENT;
        const radian = ((angle - 90) * Math.PI) / 180; // -90 so 0° is at top
        const labelRadius = 95;
        const x = Math.cos(radian) * labelRadius;
        const y = Math.sin(radian) * labelRadius;
        const isSelected = vibe === current;
        
        return (
          <motion.div
            key={vibe}
            className="absolute flex items-center justify-center w-12 h-8 rounded-full backdrop-blur-sm pointer-events-none"
            style={{
              left: RADIUS + x - 24, // center + offset - half width
              top: RADIUS + y - 16,  // center + offset - half height
              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'transparent',
              border: isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
            }}
            animate={{
              scale: isSelected ? 1.1 : 1,
              opacity: isSelected ? 1 : 0.7,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <span
              className="text-xs font-medium capitalize select-none"
              style={{
                color: isSelected ? '#ffffff' : '#999999',
                fontWeight: isSelected ? 'bold' : 'normal'
              }}
            >
              {vibe}
            </span>
          </motion.div>
        );
      })}
      
      {/* Center indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm">
          <div className="w-4 h-4 rounded-full bg-white/80" />
        </div>
      </div>

      {/* Draggable mood orb with pulse animation */}
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={false}
        onDragEnd={handleOrbDragEnd}
        animate={PULSE_ANIMATION}
        className="absolute rounded-full shadow-lg cursor-grab active:cursor-grabbing"
        style={{
          width: ORB_RADIUS * 2,
          height: ORB_RADIUS * 2,
          x: orbX,
          y: orbY,
          left: RADIUS,
          top: RADIUS,
          backgroundColor: currentColor,
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