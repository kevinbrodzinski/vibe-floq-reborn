import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useId, useEffect, useState } from 'react';
import { useRobustTimelineGeometry } from '@/hooks/useRobustTimelineGeometry';
import { buildTimelinePath } from '@/utils/timelinePath';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface DynamicTimelinePathProps {
  /** outer scrolling container (usually the main page ref) */
  containerRef: React.RefObject<HTMLElement>;
  /** afterglow moments */
  moments: { vibe_intensity?: number; color?: string; heightVariance?: number }[];
  /** timeline rendering mode - 'math' for uniform cards, 'geometry' for variable heights */
  mode?: 'math' | 'geometry';
}

/**
 * Sticky SVG squiggle that "draws" itself on scroll.
 */
export const DynamicTimelinePath = ({
  containerRef,
  moments,
  mode = 'math', // Default to fast math-only mode
}: DynamicTimelinePathProps) => {
  const prefersReduced = usePrefersReducedMotion();
  const uniqueId = useId();
  const [isHydrated, setIsHydrated] = useState(false);

  // Guard: ensure container exists before setting up scroll
  if (!containerRef.current && typeof window !== 'undefined') {
    return null;
  }

  const { scrollYProgress } = useScroll({ target: containerRef });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Hybrid approach: use geometry for variable heights, math for uniform
  const geometryData = useRobustTimelineGeometry({
    containerRef,
    moments,
    enabled: isHydrated && mode === 'geometry'
  });

  const mathData = useMemo(() => {
    if (mode !== 'math' || moments.length === 0) return { pathString: '', totalHeight: 0 };
    
    const pathString = buildTimelinePath(moments);
    const totalHeight = moments.length * 80 + 60;
    return { pathString, totalHeight };
  }, [moments, mode]);

  const { pathString, totalHeight } = mode === 'geometry' ? geometryData : mathData;
  const isReady = mode === 'geometry' ? geometryData.isReady : pathString.length > 0;

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
      className={prefersReduced ? "absolute left-6 top-0 w-12" : "pointer-events-auto absolute left-6 top-0 w-12 cursor-pointer"}
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
        className={prefersReduced ? "" : "hover:stroke-8 transition-all duration-200"}
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