import React from 'react';
import { VIBE_ORDER, VIBE_RGB } from '@/constants/vibes';

interface RingGradientProps {
  size?: number;
  strokeWidth?: number;
  mode?: 'rainbow' | 'solid';
  singleColor?: string;
}

export const RingGradient: React.FC<RingGradientProps> = ({ 
  size = 280, 
  strokeWidth = 6,
  mode = 'rainbow',
  singleColor = '#4C92FF'
}) => {
  if (mode === 'solid') {
    // Solid mode: Simple colored ring
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: singleColor,
          WebkitMaskImage: `radial-gradient(circle ${size / 2 - strokeWidth}px, transparent 99%, #000 100%)`,
          maskImage: `radial-gradient(circle ${size / 2 - strokeWidth}px, transparent 99%, #000 100%)`,
          maskType: 'alpha',
          position: 'absolute',
        }}
        aria-hidden="true"
      />
    );
  }

  // Rainbow mode: Conic gradient color wheel
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(
          #4C92FF 0deg,
          #00C2D1 40deg,
          #FF63C7 80deg,
          #FF4757 120deg,
          #A750FF 160deg,
          #8E8E93 200deg,
          #23D160 240deg,
          #AF52DE 280deg,
          #5856D6 320deg,
          #4C92FF 360deg
        )`,
        /* Cross-browser mask to cut the center hole */
        WebkitMaskImage: `radial-gradient(circle ${size / 2 - strokeWidth}px, transparent 99%, #000 100%)`,
        maskImage: `radial-gradient(circle ${size / 2 - strokeWidth}px, transparent 99%, #000 100%)`,
        maskType: 'alpha',
        position: 'absolute',
      }}
      aria-hidden="true"
    />
  );
};