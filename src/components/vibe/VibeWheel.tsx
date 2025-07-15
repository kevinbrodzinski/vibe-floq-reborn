import React, { memo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_RGB, VibeEnum } from '@/constants/vibes';
import { VIBE_DESCRIPTIONS } from '@/constants/vibeDescriptions';
import { RingGradient } from './ConicGradientRing';

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
      {/* Cross-platform gradient ring with proper masking */}
      <RingGradient 
        mode="rainbow" 
        singleColor={currentColor}
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
        <div className="text-center">
          <h2 
            className="text-3xl font-bold text-white capitalize mb-1"
            style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}
          >
            {current?.toUpperCase() ?? 'SELECT'}
          </h2>
          {current && (
            <p 
              className="text-sm text-white/70 font-medium max-w-40 text-center"
              style={{ fontSize: 12, color: '#ccc', textAlign: 'center', maxWidth: 160 }}
            >
              {VIBE_DESCRIPTIONS[current]}
            </p>
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