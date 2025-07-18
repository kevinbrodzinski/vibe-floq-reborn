import { useScroll, useTransform, motion } from 'framer-motion';
import { RefObject, useEffect, useState } from 'react';
import { useTimelineGeometry } from '@/hooks/useTimelineGeometry';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface DynamicTimelinePathProps {
  containerRef: RefObject<HTMLElement>;
  moments: any[];
  enabled?: boolean; // Feature flag for A/B testing
}

export const DynamicTimelinePath = ({ 
  containerRef, 
  moments, 
  enabled = true 
}: DynamicTimelinePathProps) => {
  const { scrollYProgress } = useScroll({ target: containerRef });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const prefersReduced = usePrefersReducedMotion();
  const [isHydrated, setIsHydrated] = useState(false);

  const { 
    pathString, 
    gradientStops, 
    totalHeight 
  } = useTimelineGeometry({ 
    containerRef, 
    moments, 
    enabled: enabled && isHydrated 
  });

  // Lazy hydrate after first frame to avoid blocking first paint
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!enabled || !isHydrated || moments.length === 0 || !pathString) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      width={60}
      height={totalHeight}
      className="absolute left-0 top-0 select-none pointer-events-none z-10 overflow-visible"
      style={{ minHeight: totalHeight }}
    >
      <defs>
        <linearGradient id="vibeGradient" x1="0" y1="0" x2="0" y2="100%">
          {gradientStops.map((stop, index) => (
            <stop
              key={index}
              offset={`${stop.offset}%`}
              stopColor={stop.color}
            />
          ))}
        </linearGradient>
      </defs>
      <motion.path
        d={pathString}
        strokeWidth={4}
        stroke="url(#vibeGradient)"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 1"
        {...(!prefersReduced && { 
          style: { pathLength },
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.5, ease: "easeOut" }
        })}
      />
    </svg>
  );
};