import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo, useId, useEffect, useState } from 'react';
import { useRobustTimelineGeometry } from '@/hooks/useRobustTimelineGeometry';
import { buildTimelinePath } from '@/utils/timelinePath';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { needsGeometry, getAverageCardHeight } from './helpers';

interface DynamicTimelinePathProps {
  /** outer scrolling container (usually the main page ref) */
  containerRef: React.RefObject<HTMLElement>;
  /** afterglow moments */
  moments: { vibe_intensity?: number; color?: string }[];
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

  // Always call hooks - conditional returns only after all hooks
  const { scrollYProgress } = useScroll({ target: containerRef });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Lazy hydrate after first frame to avoid blocking first paint
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Get actual container dimensions for accurate path generation
  const spineWidth = containerRef.current?.offsetWidth ?? 48;
  const avgCardHeight = getAverageCardHeight(containerRef);

  // Hybrid approach: use geometry for variable heights, math for uniform
  const geometryData = useRobustTimelineGeometry({
    containerRef,
    moments,
    enabled: isHydrated && mode === 'geometry'
  });

  const mathData = useMemo(() => {
    if (mode !== 'math' || moments.length === 0) return { pathString: '', isReady: false };
    
    const pathString = buildTimelinePath(moments, Math.min(spineWidth, 48), avgCardHeight);
    return { pathString, isReady: pathString.length > 0 };
  }, [moments, mode, spineWidth, avgCardHeight]);

  const { pathString, isReady } = mode === 'geometry' ? geometryData : mathData;
  const svgHeight = mode === 'geometry' ? geometryData.totalHeight : moments.length * avgCardHeight + 60;

  // Early bail for empty moments or during hydration - AFTER all hooks
  if (!isHydrated || moments.length === 0 || !isReady || !pathString) {
    return null;
  }

  const gradientId = `tl-gradient-${uniqueId}`;

  return (
    <svg
      className={prefersReduced ? "absolute left-6 top-0 w-12" : "pointer-events-auto absolute left-6 top-0 w-12 cursor-pointer"}
      height={svgHeight}
      viewBox={`0 0 48 ${svgHeight}`}
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
        style={prefersReduced ? {} : { pathLength }}
        initial={prefersReduced ? {} : { pathLength: 0 }}
        animate={prefersReduced ? {} : { pathLength: 1 }}
        transition={prefersReduced ? {} : { duration: 0.5 }}
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