import React from 'react';

interface RingGradientProps {
  size?: number;
  stroke?: number;
}

export const RingGradient: React.FC<RingGradientProps> = ({ size = 280, stroke = 6 }) => (
  <svg width={size} height={size} className="absolute inset-0">
    <defs>
      <linearGradient id="wheel-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4C92FF" />   {/* Chill */}
        <stop offset="12%" stopColor="#00C2D1" />  {/* Flowing */}
        <stop offset="23%" stopColor="#FF63C7" />  {/* Romantic */}
        <stop offset="34%" stopColor="#FF4757" />  {/* Hype */}
        <stop offset="45%" stopColor="#FFD60A" />  {/* Weird */}
        <stop offset="56%" stopColor="#8E8E93" />  {/* Solo */}
        <stop offset="67%" stopColor="#007AFF" />  {/* Social */}
        <stop offset="78%" stopColor="#AF52DE" />  {/* Open */}
        <stop offset="89%" stopColor="#5856D6" />  {/* Down */}
        <stop offset="100%" stopColor="#4C92FF" /> {/* Back to Chill */}
      </linearGradient>
    </defs>
    <circle
      cx={size / 2}
      cy={size / 2}
      r={(size - stroke) / 2}
      fill="none"
      stroke="url(#wheel-gradient)"
      strokeWidth={stroke}
      aria-hidden="true"
    />
  </svg>
);