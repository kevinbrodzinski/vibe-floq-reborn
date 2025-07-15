import React from 'react';
import { VIBE_ORDER, VIBE_RGB } from '@/constants/vibes';

interface ConicGradientRingProps {
  size?: number;
  strokeWidth?: number;
}

export const ConicGradientRing: React.FC<ConicGradientRingProps> = ({ 
  size = 280, 
  strokeWidth = 6 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / VIBE_ORDER.length;
  
  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        {/* Create individual gradient for each segment */}
        {VIBE_ORDER.map((vibe, index) => {
          const [r, g, b] = VIBE_RGB[vibe];
          const nextIndex = (index + 1) % VIBE_ORDER.length;
          const [nr, ng, nb] = VIBE_RGB[VIBE_ORDER[nextIndex]];
          
          return (
            <linearGradient key={vibe} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={`rgb(${r},${g},${b})`} />
              <stop offset="100%" stopColor={`rgb(${nr},${ng},${nb})`} />
            </linearGradient>
          );
        })}
      </defs>
      
      {/* Render each segment with its gradient */}
      {VIBE_ORDER.map((vibe, index) => {
        const angle = (360 / VIBE_ORDER.length) * index;
        const startAngle = angle;
        const endAngle = angle + (360 / VIBE_ORDER.length);
        
        const strokeDasharray = `${segmentLength} ${circumference}`;
        const strokeDashoffset = -segmentLength * index;
        
        return (
          <circle
            key={vibe}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#gradient-${index})`}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            aria-hidden="true"
          />
        );
      })}
    </svg>
  );
};