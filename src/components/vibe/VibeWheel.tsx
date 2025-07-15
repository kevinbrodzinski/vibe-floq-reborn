import React, { memo, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_COLORS, VibeEnum } from '@/constants/vibes';

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
const ORB_RADIUS = 12;                                // Orb radius  
const SEGMENT = 360 / VIBE_ORDER.length;             // 40° per segment
const SPRING_CONFIG = { type: "spring" as const, stiffness: 300, damping: 25 };

/* ---------- helpers ---------- */
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const rgbFromHsl = (h: number, s: number, l: number) => {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= h && h < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= h && h < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `rgb(${r},${g},${b})`;
};

/* Convert vibe colors to HSL values for interpolation */
const VIBE_HSL_VALUES = VIBE_ORDER.map((vibe) => {
  const color = VIBE_COLORS[vibe];
  // Extract HSL values from the color string
  if (color.includes('var(--accent)')) {
    return { h: 240, s: 70, l: 60 }; // Default accent color
  }
  const match = color.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (match) {
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3])
    };
  }
  return { h: 240, s: 70, l: 60 }; // fallback
});

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

  /* ---------- background glow color ---------- */
  const glowColor = useTransform(orbAngle, (angle) => {
    const raw = angle / SEGMENT;
    const base = Math.floor(((raw % VIBE_ORDER.length) + VIBE_ORDER.length) % VIBE_ORDER.length);
    const t = raw - base;
    
    const color1 = VIBE_HSL_VALUES[base];
    const color2 = VIBE_HSL_VALUES[(base + 1) % VIBE_ORDER.length];
    
    const h = mix(color1.h, color2.h, t);
    const s = mix(color1.s, color2.s, t);
    const l = mix(color1.l, color2.l, t);
    
    return rgbFromHsl(h, s, l);
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
    const velocity = Math.sqrt(info.velocity.x ** 2 + info.velocity.y ** 2);
    const offset = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    
    // Calculate angle based on drag offset
    let angle = (Math.atan2(info.offset.y, info.offset.x) * 180) / Math.PI + 90; // +90 so 0° is at top
    if (angle < 0) angle += 360;
    
    // Add the offset to current angle
    const currentAngle = orbAngle.get();
    const dragAngle = (info.offset.x > 0 ? 1 : -1) * Math.min(offset * 0.5, 180); // limit max rotation
    let newAngle = currentAngle + dragAngle;
    
    // Normalize angle
    while (newAngle < 0) newAngle += 360;
    while (newAngle >= 360) newAngle -= 360;
    
    // Snap to nearest segment
    const snappedAngle = Math.round(newAngle / SEGMENT) * SEGMENT;
    orbAngle.set(snappedAngle);
    
    // Determine which vibe was selected
    const idx = ((Math.round(snappedAngle / SEGMENT) % VIBE_ORDER.length) + VIBE_ORDER.length) % VIBE_ORDER.length;
    commitVibe(VIBE_ORDER[idx]);
  }, [orbAngle, commitVibe]);

  return (
    <div 
      className="relative w-[280px] h-[280px] mx-auto"
      style={{ touchAction: 'none' }}
    >
      {/* Static circle background */}
      <div className="relative w-full h-full rounded-full overflow-hidden bg-black/10 shadow-lg backdrop-blur-sm">
        
        {/* Animated glow background */}
        <motion.div 
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: glowColor,
            opacity: 0.35,
          }}
        />
        
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
              className="absolute flex items-center justify-center w-12 h-8 rounded-full backdrop-blur-sm"
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
              transition={SPRING_CONFIG}
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
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm">
            <div className="w-4 h-4 rounded-full bg-white/80" />
          </div>
        </div>
      </div>

      {/* Draggable mood orb */}
      <motion.div
        drag
        dragMomentum={false}
        dragConstraints={false}
        onDragEnd={handleOrbDragEnd}
        className="absolute rounded-full shadow-lg cursor-grab active:cursor-grabbing"
        style={{
          width: ORB_RADIUS * 2,
          height: ORB_RADIUS * 2,
          x: orbX,
          y: orbY,
          left: RADIUS,
          top: RADIUS,
          backgroundColor: VIBE_COLORS[current ?? 'chill'],
          border: '3px solid rgba(255,255,255,0.8)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
        whileHover={{ scale: 1.1 }}
        whileDrag={{ scale: 1.2, zIndex: 10 }}
        transition={SPRING_CONFIG}
        role="slider"
        aria-label={`Current vibe: ${current}. Drag to change.`}
      />
    </div>
  );
});