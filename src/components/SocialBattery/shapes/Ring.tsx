import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

export default function Ring({
  size = 52,
  energy01,
  accent = 'hsl(var(--primary))',
  trackOpacity = 0.18,
  stroke = 6,
  showCrack = false,
}:{
  size?: number;
  energy01: number;
  accent?: string;
  trackOpacity?: number;
  stroke?: number;
  showCrack?: boolean;
}) {
  const e = Math.max(0, Math.min(1, energy01));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = `${c * e}, ${c}`;
  
  return (
    <Svg width={size} height={size}>
      <Circle 
        cx={size/2} 
        cy={size/2} 
        r={r} 
        stroke={accent} 
        strokeOpacity={trackOpacity} 
        strokeWidth={stroke} 
        fill="none"
      />
      <Circle 
        cx={size/2} 
        cy={size/2} 
        r={r}
        stroke={accent} 
        strokeWidth={stroke} 
        fill="none"
        strokeDasharray={dash} 
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      {showCrack && (
        <Path
          d={crackPath(size)}
          stroke={accent}
          strokeOpacity={0.7}
          strokeWidth={Math.max(1, stroke*0.4)}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

function crackPath(size: number) {
  const cx = size/2, cy = size/2, rr = size/2 - 3;
  const a1 = -20 * Math.PI/180, a2 = -12 * Math.PI/180;
  const x1 = cx + rr * Math.cos(a1), y1 = cy + rr * Math.sin(a1);
  const x2 = cx + rr * Math.cos(a2), y2 = cy + rr * Math.sin(a2);
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}