import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { VibeBreakdown } from '@/types/discovery';

interface BreakdownStripProps {
  targetId: string;
  className?: string;
}

// Mock hook - will be replaced with real data
const useMockVibeBreakdown = (targetId: string): VibeBreakdown => {
  return {
    overall: 78,
    venueDNA: 70,
    timeRhythm: 50,
    socialPattern: 90
  } as const satisfies VibeBreakdown;
};

export const BreakdownStrip: React.FC<BreakdownStripProps> = ({ 
  targetId, 
  className 
}) => {
  const data = useMockVibeBreakdown(targetId);

  const rows = [
    { key: 'venueDNA', icon: '☕', label: 'Venue', score: data.venueDNA },
    { key: 'timeRhythm', icon: '🕒', label: 'Time', score: data.timeRhythm },
    { key: 'socialPattern', icon: '🧑‍🤝‍🧑', label: 'Social', score: data.socialPattern },
  ];

  const getScoreColor = (score: number) => {
    if (score < 40) return 'text-muted-foreground/50 bg-muted-foreground/50';
    if (score < 70) return 'text-warning bg-warning/80';
    return 'text-success bg-success';
  };

  return (
    <div className={cn("space-y-1 flex-1", className)}>
      {rows.map((row, index) => (
        <motion.div
          key={row.key}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.1,
            ease: 'easeOut' 
          }}
        >
          <span className="w-4 text-center text-xs">{row.icon}</span>
          <span className="text-xs flex-1 text-foreground/80">{row.label}</span>
          
          <div className="flex-1 bg-surface/20 rounded-full h-1 overflow-hidden">
            <motion.div
              className={cn('h-1 rounded-full', getScoreColor(row.score).split(' ')[1])}
              initial={{ width: 0 }}
              animate={{ width: `${row.score}%` }}
              transition={{ 
                duration: 0.8, 
                delay: index * 0.1 + 0.2,
                ease: 'easeOut' 
              }}
            />
          </div>
          
          <motion.span 
            className={cn("w-8 text-right text-xs", getScoreColor(row.score).split(' ')[0])}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.1 + 0.5 
            }}
          >
            {row.score}%
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
};