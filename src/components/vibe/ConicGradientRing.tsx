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
          #4C92FF 0deg,      /* Chill - Blue */
          #FF6B35 40deg,     /* Flowing - Orange */
          #FF1744 80deg,     /* Romantic - Pink */
          #FF4757 120deg,    /* Hype - Red */
          #A855F7 160deg,    /* Weird - Purple */
          #6B7280 200deg,    /* Solo - Gray */
          #10B981 240deg,    /* Social - Green */
          #8B5CF6 280deg,    /* Open - Purple */
          #1E40AF 320deg,    /* Down - Dark Blue */
          #4C92FF 360deg     /* Back to Chill */
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