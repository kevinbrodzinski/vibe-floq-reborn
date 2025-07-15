import React from 'react';

interface RingGradientProps {
  size?: number;
  stroke?: number;
}

export const RingGradient: React.FC<RingGradientProps> = ({ size = 280, stroke = 6 }) => (
  <svg width={size} height={size} className="absolute inset-0">
    <defs>
      <linearGradient id="wheel-gradient">
        <defs>
          <radialGradient id="conic-gradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#4C92FF" />     {/* Chill - Blue */}
            <stop offset="11.11%" stopColor="#FF6B35" /> {/* Flowing - Orange */}
            <stop offset="22.22%" stopColor="#FF1744" /> {/* Romantic - Pink/Red */}
            <stop offset="33.33%" stopColor="#FF4757" /> {/* Hype - Red */}
            <stop offset="44.44%" stopColor="#A855F7" /> {/* Weird - Purple */}
            <stop offset="55.55%" stopColor="#6B7280" /> {/* Solo - Gray */}
            <stop offset="66.66%" stopColor="#10B981" /> {/* Social - Green */}
            <stop offset="77.77%" stopColor="#8B5CF6" /> {/* Open - Purple */}
            <stop offset="88.88%" stopColor="#1E40AF" /> {/* Down - Dark Blue */}
            <stop offset="100%" stopColor="#4C92FF" />   {/* Back to Chill */}
          </radialGradient>
        </defs>
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