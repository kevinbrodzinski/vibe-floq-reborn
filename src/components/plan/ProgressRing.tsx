import React from 'react';

export function ProgressRing({
  size = 64,
  stroke = 6,
  value = 0,
  className = '',
}: { size?: number; stroke?: number; value?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * c;

  return (
    <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" opacity={0.16} strokeWidth={stroke} fill="none"/>
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke="currentColor" strokeWidth={stroke} fill="none"
        strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray .6s ease' }}
      />
    </svg>
  );
}