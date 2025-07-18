import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useId, useEffect, useState } from 'react';
import { useRobustTimelineGeometry } from '@/hooks/useRobustTimelineGeometry';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface DynamicTimelinePathProps {
  /** outer scrolling container (usually the main page ref) */
  containerRef: React.RefObject<HTMLElement>;
  /** afterglow moments */
  moments: { vibe_intensity?: number; color?: string }[];
}

/**
 * Sticky SVG squiggle that "draws" itself on scroll.
 */
export const DynamicTimelinePath = ({
  containerRef,
  moments,
}: DynamicTimelinePathProps) => {
  const prefersReduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const uniqueId = useId();
  const [isHydrated, setIsHydrated] = useState(false);

  const { pathString, totalHeight, isReady } = useRobustTimelineGeometry({
    containerRef,
    moments,
    enabled: isHydrated
  });

  // Lazy hydrate after first frame to avoid blocking first paint
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (moments.length === 0 || !isHydrated || !isReady) return null;

  const gradientId = `tl-gradient-${uniqueId}`;

  return (
    <svg
      className="pointer-events-auto absolute left-6 top-0 w-12 cursor-pointer"
      height={totalHeight}
      viewBox={`0 0 48 ${totalHeight}`}
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
    >
      <motion.path
        d={pathString}
        stroke={`url(#${gradientId})`}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        className="hover:stroke-8 transition-all duration-200"
        {...(!prefersReduced && {
          style: { pathLength },
          initial: { pathLength: 0 },
          animate: { pathLength: 1 },
          transition: { duration: 0.5, ease: "easeOut" }
        })}
      />
      {/* Linear-gradient driven by first/last moment colors (fallback theme-safe) */}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={moments[0]?.color ?? 'hsl(var(--primary-foreground))'}
            stopOpacity="1"
          />
          <stop
            offset="100%"
            stopColor={
              moments[moments.length - 1]?.color ?? moments[0]?.color ?? 'hsl(var(--primary-foreground))'
            }
            stopOpacity="1"
          />
        </linearGradient>
      </defs>
    </svg>
  );
};