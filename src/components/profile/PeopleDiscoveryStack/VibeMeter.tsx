import React, { useMemo } from 'react';
import { motion, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVibeBreakdown } from '@/hooks/useVibeBreakdown';

interface VibeeMeterProps {
  targetId: string;
  className?: string;
}

export const VibeMeter: React.FC<VibeeMeterProps> = ({ targetId, className }) => {
  const { data: breakdown, isLoading } = useVibeBreakdown(targetId);
  const score = breakdown?.overall ?? 50;
  const clamped = Math.min(100, Math.max(0, score));
  const angle = useMemo(() => -110 + (clamped * 220) / 100, [clamped]);
  const spring = useSpring(angle, { stiffness: 120, damping: 14 });

  const polarToCartesian = (r: number, deg: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    return [32 + r * Math.cos(rad), 32 + r * Math.sin(rad)];
  };

  const arc = (start: number, end: number, r: number, className: string) => {
    const [sx, sy] = polarToCartesian(r, start);
    const [ex, ey] = polarToCartesian(r, end);
    const large = end - start <= 180 ? 0 : 1;
    return (
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
        className={cn('fill-none stroke-[6] rounded-full', className)}
        strokeLinecap="round"
      />
    );
  };

  if (isLoading) {
    return (
      <div className={cn("w-16 h-16 rounded-full animate-pulse bg-muted", className)} />
    );
  }

  const getScoreColor = (score: number) => {
    if (score < 40) return 'hsl(var(--muted-foreground))';
    if (score < 70) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  };

  const shouldGlow = clamped >= 80;

  return (
    <div className={cn("relative w-16 h-16", className)}>
      {/* Glow effect for high scores */}
      {shouldGlow && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)'
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}

      <div 
        role="img" 
        aria-label={`Compatibility ${clamped} percent`}
        className="relative"
      >
        <svg width="64" height="64" className="rotate-90 -scale-x-100">
        {/* Track segments */}
        {arc(-110, -44, 28, 'stroke-muted-foreground/30')}
        {arc(-44, 22, 28, 'stroke-warning/60')}  
        {arc(22, 110, 28, 'stroke-success/80')}

        {/* Needle */}
        <motion.line
          x1="32"
          y1="32"
          x2="32"
          y2="10"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ 
            originX: '50%', 
            originY: '50%', 
            rotate: spring 
          }}
        />
        <circle cx="32" cy="32" r="3" className="fill-primary" />
      </svg>
      </div>

      {/* Score label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          className="text-lg font-semibold text-primary"
          key={clamped}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {clamped}%
        </motion.span>
        <span className="text-[10px] text-muted-foreground">compatibility</span>
      </div>

      {/* Sparks for high scores */}
      {clamped >= 95 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{
                left: '50%',
                top: '20%',
                transform: 'translate(-50%, -50%)'
              }}
              animate={{
                x: [0, (i - 1) * 15],
                y: [0, -10 - i * 5],
                opacity: [1, 0],
                scale: [1, 0]
              }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                repeat: Infinity,
                repeatDelay: 2
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};