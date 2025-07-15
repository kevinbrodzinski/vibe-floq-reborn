import React from 'react';
import { VIBE_ORDER, VIBE_RGB } from '@/constants/vibes';

interface ConicGradientRingProps {
  size?: number;
  strokeWidth?: number;
  mode?: 'rainbow' | 'solid';
  singleColor?: string;
}

export const ConicGradientRing: React.FC<ConicGradientRingProps> = ({ 
  size = 280, 
  strokeWidth = 6,
  mode = 'rainbow',
  singleColor = '#4C92FF'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const segmentLength = circumference / VIBE_ORDER.length;
  
  return (
    <svg width={size} height={size} className="absolute inset-0">
      <defs>
        {mode === 'rainbow' ? (
          // Use CSS conic-gradient for smooth color wheel effect
          <foreignObject width="100%" height="100%">
            <div 
              style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: `conic-gradient(from 0deg, 
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
                mask: `radial-gradient(circle, transparent ${radius - strokeWidth/2}px, black ${radius - strokeWidth/2}px, black ${radius + strokeWidth/2}px, transparent ${radius + strokeWidth/2}px)`,
                WebkitMask: `radial-gradient(circle, transparent ${radius - strokeWidth/2}px, black ${radius - strokeWidth/2}px, black ${radius + strokeWidth/2}px, transparent ${radius + strokeWidth/2}px)`,
              }}
            />
          </foreignObject>
        ) : (
          // Solid mode fallback with SVG circle
          <>
            <linearGradient id="solid-gradient">
              <stop offset="0%" stopColor={singleColor} />
              <stop offset="100%" stopColor={singleColor} />
            </linearGradient>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#solid-gradient)"
              strokeWidth={strokeWidth}
              aria-hidden="true"
            />
          </>
        )}
      </defs>
    </svg>
  );
};