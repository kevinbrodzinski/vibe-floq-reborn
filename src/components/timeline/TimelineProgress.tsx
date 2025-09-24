import React, { memo, RefObject } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useTimelineProgress } from '@/hooks/useTimelineProgress';

type TimelineProgressProps = {
  containerRef: RefObject<HTMLElement>;
  moments: any[];
  className?: string;
};

export const TimelineProgress = memo(({ 
  containerRef, 
  moments, 
  className = '' 
}: TimelineProgressProps) => {
  const { scrollProgress, currentMomentIndex } = useTimelineProgress(containerRef, moments);

  if (moments.length === 0) return null;

  return (
    <aside className={clsx("fixed left-4 top-24 z-20 flex flex-col items-center", className)}>
      {/* Gradient spine */}
      <motion.div
        className="w-1 rounded-full bg-gradient-to-b from-cyan-400 to-fuchsia-500"
        style={{ height: `${scrollProgress * 100}%` }}
        initial={{ height: 0 }}
        animate={{ height: `${scrollProgress * 100}%` }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
      />
      
      {/* Moment dots */}
      <div className="relative h-full w-full">
        {moments.map((moment, i) => {
          const position = moments.length > 1 ? (i / Math.max(1, moments.length - 1)) * 100 : 50;
          const isActive = i === currentMomentIndex;
          
          return (
            <motion.span
              key={moment.id || i}
              className={clsx(
                'absolute w-3 h-3 -ml-1.5 rounded-full border-2 border-background',
                isActive ? 'scale-100 bg-white shadow-lg' : 'scale-75 bg-slate-600',
              )}
              style={{ top: `${position}%` }}
              animate={{
                scale: isActive ? 1 : 0.75,
                backgroundColor: isActive ? '#ffffff' : moment.color || '#64748b'
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            />
          );
        })}
      </div>
    </aside>
  );
});

TimelineProgress.displayName = 'TimelineProgress';