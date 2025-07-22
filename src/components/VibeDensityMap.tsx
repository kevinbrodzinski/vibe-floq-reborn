
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { zIndex } from '@/constants/z';

interface VibeData {
  id: string;
  x: number;
  y: number;
  intensity: number;
  type: 'chill' | 'party' | 'work' | 'social' | 'creative';
  radius?: number;
}

interface VibeDensityMapProps {
  vibes?: VibeData[];
  containerWidth?: number;
  containerHeight?: number;
  showLabels?: boolean;
  interactive?: boolean;
  onVibeClick?: (vibe: VibeData) => void;
  className?: string;
}

const VIBE_COLORS = {
  chill: '#10b981',    // emerald-500
  party: '#f59e0b',    // amber-500
  work: '#3b82f6',     // blue-500
  social: '#ec4899',   // pink-500
  creative: '#8b5cf6', // violet-500
} as const;

const VIBE_LABELS = {
  chill: 'Chill',
  party: 'Party',
  work: 'Focus',
  social: 'Social',
  creative: 'Creative',
} as const;

export const VibeDensityMap: React.FC<VibeDensityMapProps> = ({
  vibes = [],
  containerWidth = 400,
  containerHeight = 300,
  showLabels = true,
  interactive = true,
  onVibeClick = () => {},
  className = ""
}) => {
  const vibeCircles = useMemo(() => {
    return vibes.map(vibe => ({
      ...vibe,
      radius: vibe.radius || Math.max(20, vibe.intensity * 50),
      color: VIBE_COLORS[vibe.type],
      opacity: Math.min(0.8, vibe.intensity * 0.6 + 0.2)
    }));
  }, [vibes]);

  const densityGrid = useMemo(() => {
    const gridSize = 20;
    const cellWidth = containerWidth / gridSize;
    const cellHeight = containerHeight / gridSize;
    const grid: number[][] = [];

    // Initialize grid
    for (let i = 0; i < gridSize; i++) {
      grid[i] = new Array(gridSize).fill(0);
    }

    // Calculate density
    vibes.forEach(vibe => {
      const centerX = Math.floor((vibe.x / 100) * gridSize);
      const centerY = Math.floor((vibe.y / 100) * gridSize);
      const radius = Math.ceil((vibe.radius || 30) / Math.min(cellWidth, cellHeight));

      for (let i = Math.max(0, centerX - radius); i < Math.min(gridSize, centerX + radius); i++) {
        for (let j = Math.max(0, centerY - radius); j < Math.min(gridSize, centerY + radius); j++) {
          const distance = Math.sqrt((i - centerX) ** 2 + (j - centerY) ** 2);
          if (distance <= radius) {
            const intensity = vibe.intensity * (1 - distance / radius);
            grid[i][j] += intensity;
          }
        }
      }
    });

    return grid;
  }, [vibes, containerWidth, containerHeight]);

  return (
    <div 
      {...zIndex('overlay')}
      className={`relative ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
    >
      {/* Background density visualization */}
      <svg
        width={containerWidth}
        height={containerHeight}
        className="absolute inset-0"
      >
        <defs>
          {/* Gradient definitions for each vibe type */}
          {Object.entries(VIBE_COLORS).map(([type, color]) => (
            <radialGradient key={type} id={`gradient-${type}`}>
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="50%" stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Render vibe circles */}
        {vibeCircles.map((vibe, index) => (
          <motion.circle
            key={vibe.id}
            initial={{ r: 0, opacity: 0 }}
            animate={{ 
              r: vibe.radius,
              opacity: vibe.opacity,
              cx: (vibe.x / 100) * containerWidth,
              cy: (vibe.y / 100) * containerHeight
            }}
            transition={{
              duration: 0.8,
              delay: index * 0.1,
              ease: "easeOut"
            }}
            fill={`url(#gradient-${vibe.type})`}
            className={interactive ? "cursor-pointer" : ""}
            onClick={() => interactive && onVibeClick(vibe)}
          />
        ))}
      </svg>

      {/* Vibe markers and labels */}
      {vibeCircles.map((vibe, index) => (
        <motion.div
          key={`marker-${vibe.id}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1 + 0.3,
            type: "spring",
            stiffness: 400
          }}
          className={`absolute pointer-events-none`}
          style={{
            left: `${vibe.x}%`,
            top: `${vibe.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Center dot */}
          <div
            className="w-3 h-3 rounded-full shadow-lg"
            style={{ backgroundColor: vibe.color }}
          />

          {/* Label */}
          {showLabels && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.5 }}
              className="absolute top-6 left-1/2 -translate-x-1/2"
            >
              <Badge 
                variant="secondary" 
                className="text-xs px-2 py-1 shadow-sm"
                style={{ 
                  backgroundColor: `${vibe.color}20`,
                  borderColor: vibe.color,
                  color: vibe.color
                }}
              >
                {VIBE_LABELS[vibe.type]}
              </Badge>
            </motion.div>
          )}

          {/* Intensity indicator */}
          {vibe.intensity > 0.7 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.8, 0.4, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400 shadow-sm"
            />
          )}
        </motion.div>
      ))}

      {/* Legend */}
      {showLabels && vibes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="absolute bottom-4 left-4 flex flex-wrap gap-2"
        >
          {Object.entries(VIBE_COLORS).map(([type, color]) => {
            const hasVibes = vibes.some(v => v.type === type);
            if (!hasVibes) return null;

            return (
              <Badge
                key={type}
                variant="outline"
                className="text-xs px-2 py-1"
                style={{
                  borderColor: color,
                  color: color,
                  backgroundColor: `${color}10`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: color }}
                />
                {VIBE_LABELS[type as keyof typeof VIBE_LABELS]}
              </Badge>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
