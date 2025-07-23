import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface VibeData {
  id: string;
  x: number;   // 0-100 percentage of container width
  y: number;   // 0-100 percentage of container height
  intensity: number;            // 0-1
  type: 'chill' | 'party' | 'work' | 'social' | 'creative';
  radius?: number;              // optional px radius
}

interface Props {
  /** array of vibes (ex: cluster centroids) */
  vibes: VibeData[];

  /** map (or parent) dimensions in px so we can size the SVG */
  containerWidth: number;
  containerHeight: number;

  /** show text labels near markers */
  showLabels?: boolean;

  /** allow clicking a vibe marker */
  interactive?: boolean;
  onVibeClick?: (v: VibeData) => void;

  /** extra Tailwind classes for the wrapper */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const VIBE_COLORS = {
  chill: '#10b981',    // emerald-500
  party: '#f59e0b',    // amber-500
  work:  '#3b82f6',    // blue-500
  social:'#ec4899',    // pink-500
  creative:'#8b5cf6',  // violet-500
} as const;

const VIBE_LABELS = {
  chill: 'Chill',
  party: 'Party',
  work:  'Focus',
  social:'Social',
  creative:'Creative',
} as const;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export const VibeDensityHeatOverlay: React.FC<Props> = ({
  vibes,
  containerWidth,
  containerHeight,
  showLabels = true,
  interactive = true,
  onVibeClick = () => {},
  className = '',
}) => {
  /* pre-calculate circle props ------------------------------------- */
  const vibeCircles = useMemo(
    () =>
      vibes.map((v) => ({
        ...v,
        radius: v.radius ?? Math.max(20, v.intensity * 60),
        color: VIBE_COLORS[v.type],
        opacity: Math.min(0.8, v.intensity * 0.6 + 0.2),
      })),
    [vibes],
  );

  return (
    <div
      {...zIndex('overlay')}
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
    >
      {/* ------------------------------------------------------------------ */}
      {/*  Radial-gradient background "heat" circles                         */}
      {/* ------------------------------------------------------------------ */}
      <svg
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0"
      >
        <defs>
          {Object.entries(VIBE_COLORS).map(([type, color]) => (
            <radialGradient key={type} id={`gradient-${type}`}>
              <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
              <stop offset="60%"  stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {vibeCircles.map((vibe) => (
          <motion.circle
            key={vibe.id}
            initial={{ r: 0, opacity: 0 }}
            animate={{
              r: vibe.radius,
              opacity: vibe.opacity,
              cx: (vibe.x / 100) * containerWidth,
              cy: (vibe.y / 100) * containerHeight,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            fill={`url(#gradient-${vibe.type})`}
          />
        ))}
      </svg>

      {/* ------------------------------------------------------------------ */}
      {/*  Marker dots + labels (these *can* be interactive)                 */}
      {/* ------------------------------------------------------------------ */}
      {vibeCircles.map((vibe) => (
        <motion.div
          key={`marker-${vibe.id}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 25 }}
          className="absolute"
          style={{
            left: `${vibe.x}%`,
            top: `${vibe.y}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: interactive ? 'auto' : 'none',
            cursor: interactive ? 'pointer' : 'default',
          }}
          onClick={() => interactive && onVibeClick(vibe)}
        >
          {/* dot */}
          <div
            className="w-3 h-3 rounded-full shadow-md"
            style={{ backgroundColor: vibe.color }}
          />

          {/* optional label */}
          {showLabels && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 shadow"
                style={{
                  backgroundColor: `${vibe.color}20`,
                  borderColor: vibe.color,
                  color: vibe.color,
                }}
              >
                {VIBE_LABELS[vibe.type]}
              </Badge>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};