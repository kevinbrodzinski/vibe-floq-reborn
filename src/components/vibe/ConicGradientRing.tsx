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
          #5B9BD5 0deg,      /* Chill - Soft Blue */
          #FFB84D 40deg,     /* Flowing - Warm Orange/Yellow */
          #FFE066 80deg,     /* Romantic - Golden Yellow */
          #FF7F7F 120deg,    /* Hype - Soft Red */
          #D4AF37 160deg,    /* Weird - Gold */
          #A8A8A8 200deg,    /* Solo - Soft Gray */
          #90EE90 240deg,    /* Social - Soft Green */
          #DDA0DD 280deg,    /* Open - Soft Purple */
          #87CEEB 320deg,    /* Down - Sky Blue */
          #5B9BD5 360deg     /* Back to Chill */
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