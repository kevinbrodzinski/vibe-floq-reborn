import { memo, useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useVibe, useCurrentVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_COLORS, type VibeEnum } from '@/constants/vibes';

const SEGMENT = 360 / VIBE_ORDER.length;
const SPRING_CONFIG = { stiffness: 170, damping: 18, mass: 0.6 };

interface VibeWheelProps {
  size?: number;
  disabled?: boolean;
}

export const VibeWheel = memo(({ size = 280, disabled = false }: VibeWheelProps) => {
  const setVibe = useVibe((s) => s.setVibe);
  const current = useCurrentVibe() ?? VIBE_ORDER[0];
  const [isDragging, setIsDragging] = useState(false);
  
  const theta = useMotionValue(VIBE_ORDER.indexOf(current) * SEGMENT);
  const lastSnapRef = useRef(current);

  useEffect(() => {
    if (!isDragging && current !== lastSnapRef.current) {
      const targetAngle = VIBE_ORDER.indexOf(current) * SEGMENT;
      theta.set(targetAngle);
      lastSnapRef.current = current;
    }
  }, [current, isDragging, theta]);

  const backgroundColor = useTransform(theta, (angle) => {
    const rawIndex = angle / SEGMENT;
    const baseIdx = Math.floor(((rawIndex % VIBE_ORDER.length) + VIBE_ORDER.length) % VIBE_ORDER.length);
    const t = rawIndex - baseIdx;
    const c0 = VIBE_COLORS[VIBE_ORDER[baseIdx]];
    const c1 = VIBE_COLORS[VIBE_ORDER[(baseIdx + 1) % VIBE_ORDER.length]];
    return mixColor(t, c0, c1);
  });

  const glowOpacity = useMotionValue(0.35);

  const handlePanStart = () => {
    if (disabled) return;
    setIsDragging(true);
    glowOpacity.set(0.6);
  };

  const handlePan = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    const deltaX = info.delta.x;
    const currentAngle = theta.get();
    theta.set(currentAngle + deltaX * 0.5);
  };

  const handlePanEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) {
      setIsDragging(false);
      glowOpacity.set(0.35);
      return;
    }

    const velocity = info.velocity.x * 0.5;
    const currentAngle = theta.get();
    const targetAngle = Math.round((currentAngle + velocity * 0.1) / SEGMENT) * SEGMENT;
    
    theta.set(targetAngle);
    
    const normalizedAngle = ((targetAngle % 360) + 360) % 360;
    const vibeIndex = Math.round(normalizedAngle / SEGMENT) % VIBE_ORDER.length;
    const newVibe = VIBE_ORDER[vibeIndex];
    
    setIsDragging(false);
    glowOpacity.set(0.35);
    
    if (newVibe !== current) {
      triggerSnap(newVibe);
    }
  };

  const triggerSnap = (vibe: VibeEnum) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (error) {
      // Silent fallback
    }
    
    setVibe(vibe);
    lastSnapRef.current = vibe;
  };

  return (
    <div 
      className="flex items-center justify-center"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <motion.div
        className="relative overflow-hidden border-2 border-white/20 cursor-grab active:cursor-grabbing"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          rotate: theta,
        }}
        drag={!disabled}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        animate={{ rotate: theta.get() }}
        transition={SPRING_CONFIG}
        whileTap={{ scale: 0.98 }}
        aria-label={`Current vibe: ${current}`}
        role="slider"
        tabIndex={disabled ? -1 : 0}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor,
            opacity: glowOpacity,
          }}
        />
        
        {VIBE_ORDER.map((vibe, index) => {
          const angle = index * SEGMENT;
          const isActive = vibe === current;
          
          return (
            <div
              key={vibe}
              className="absolute w-1/2 h-1 top-1/2 left-1/2 flex items-center justify-end pr-2"
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0% 50%',
                backgroundColor: VIBE_COLORS[vibe],
                opacity: isActive ? 1 : 0.7,
              }}
            >
              <span
                className="text-white text-xs font-medium drop-shadow-sm capitalize select-none"
                style={{
                  transform: `rotate(${-angle}deg)`,
                  fontWeight: isActive ? 600 : 400,
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
                }}
              >
                {vibe}
              </span>
            </div>
          );
        })}
        
        <div className="absolute top-1/2 left-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full bg-white flex items-center justify-center shadow-lg">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: VIBE_COLORS[current] }}
          />
        </div>
      </motion.div>
    </div>
  );
});

function mixColor(t: number, c0: string, c1: string): string {
  const a = parseInt(c0.slice(1), 16);
  const b = parseInt(c1.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bb2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${gg},${bb2})`;
}

VibeWheel.displayName = 'VibeWheel';