import React, { memo, useRef, useCallback, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import * as Haptics from 'expo-haptics';
import { useVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_COLORS, VibeEnum } from '@/constants/vibes';

/* ---------- constants ---------- */
const SEGMENT = 360 / VIBE_ORDER.length;           // 40°
const SPRING_CONFIG = { type: "spring" as const, stiffness: 170, damping: 18, mass: 0.6 };

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
  const constraintsRef = useRef<HTMLDivElement>(null);

  /* ---------- motion values ---------- */
  const theta = useMotionValue(VIBE_ORDER.indexOf(current ?? 'chill') * SEGMENT);
  const glowOpacity = useMotionValue(0.34);

  /* ---------- derived values ---------- */
  const wheelRotation = useTransform(theta, (value) => `${value}deg`);
  
  const glowColor = useTransform(theta, (value) => {
    const raw = value / SEGMENT;
    const base = Math.floor(((raw % VIBE_ORDER.length) + VIBE_ORDER.length) % VIBE_ORDER.length);
    const t = raw - base;
    
    const color1 = VIBE_HSL_VALUES[base];
    const color2 = VIBE_HSL_VALUES[(base + 1) % VIBE_ORDER.length];
    
    const h = mix(color1.h, color2.h, t);
    const s = mix(color1.s, color2.s, t);
    const l = mix(color1.l, color2.l, t);
    
    return rgbFromHsl(h, s, l);
  });

  /* ---------- commit snap ---------- */
  const commitSnap = useCallback(async (v: VibeEnum) => {
    if (v === current) return;
    
    // Enhanced haptics
    try {
      if (current) {
        const oldIndex = VIBE_ORDER.indexOf(current);
        const newIndex = VIBE_ORDER.indexOf(v);
        const distance = Math.abs(newIndex - oldIndex);
        
        if (distance >= 4) {
          // Large jump - stronger haptic
          await Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          // Normal selection
          await Haptics.selectionAsync?.();
        }
      } else {
        await Haptics.selectionAsync?.();
      }
    } catch (error) {
      // Fallback to web vibration
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
    
    setVibe(v);
  }, [current, setVibe]);

  /* ---------- pan handlers ---------- */
  const handlePanStart = useCallback(() => {
    glowOpacity.set(0.5);
  }, [glowOpacity]);

  const handlePan = useCallback((_: any, info: PanInfo) => {
    const currentTheta = theta.get();
    theta.set(currentTheta + info.delta.x * 0.5); // 0.5° per pixel
  }, [theta]);

  const handlePanEnd = useCallback((_: any, info: PanInfo) => {
    glowOpacity.set(0.34);
    
    // Calculate final position with momentum
    const currentTheta = theta.get();
    const velocity = info.velocity.x * 0.5;
    const finalTheta = currentTheta + velocity * 0.1; // momentum factor
    
    // Snap to nearest segment
    const snappedTheta = Math.round(finalTheta / SEGMENT) * SEGMENT;
    
    // Animate to snapped position
    theta.set(snappedTheta);
    
    // Determine which vibe was selected
    const idx = ((Math.round(snappedTheta / SEGMENT) % VIBE_ORDER.length) + VIBE_ORDER.length) % VIBE_ORDER.length;
    commitSnap(VIBE_ORDER[idx]);
  }, [theta, glowOpacity, commitSnap]);

  // Sync wheel position when vibe changes externally
  const handleVibeChange = useCallback(() => {
    const targetTheta = VIBE_ORDER.indexOf(current ?? 'chill') * SEGMENT;
    theta.set(targetTheta);
  }, [current, theta]);

  // Update wheel position when current vibe changes
  useEffect(() => {
    handleVibeChange();
  }, [current, handleVibeChange]);

  return (
    <div 
      ref={constraintsRef}
      className="relative w-[280px] h-[280px] mx-auto"
      style={{ touchAction: 'none' }}
    >
      <motion.div
        className="relative w-full h-full rounded-full overflow-hidden bg-black/10 shadow-lg"
        style={{ 
          rotate: wheelRotation,
          backdropFilter: 'blur(10px)',
        }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        drag={false}
        whileTap={{ scale: 0.98 }}
        transition={SPRING_CONFIG}
      >
        {/* Vibe labels around the circle */}
        {VIBE_ORDER.map((vibe, index) => {
          const angle = index * SEGMENT;
          const radian = (angle * Math.PI) / 180;
          const radius = 100;
          const x = Math.cos(radian) * radius;
          const y = Math.sin(radian) * radius;
          const isSelected = vibe === current;
          
          return (
            <motion.div
              key={vibe}
              className="absolute flex items-center justify-center w-12 h-8 rounded-full backdrop-blur-sm"
              style={{
                left: 140 + x - 24, // center + offset - half width
                top: 140 + y - 16,  // center + offset - half height
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
        
        {/* Animated glow background */}
        <motion.div 
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: glowColor,
            opacity: glowOpacity,
          }}
        />
        
        {/* Center indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur-sm">
            <div className="w-4 h-4 rounded-full bg-white/80" />
          </div>
        </div>
      </motion.div>
    </div>
  );
});