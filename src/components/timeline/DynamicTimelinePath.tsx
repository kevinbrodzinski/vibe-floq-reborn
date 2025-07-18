import { motion, useScroll, useTransform } from 'framer-motion';
import { useMemo } from 'react';
import { buildTimelinePath } from '@/utils/timelinePath';
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

  const d = useMemo(() => buildTimelinePath(moments), [moments]);

  if (moments.length === 0) return null;

  return (
    <svg
      className="pointer-events-auto absolute left-6 top-0 h-full w-12 cursor-pointer"
      viewBox="0 0 48 9999"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
    >
      <motion.path
        d={d}
        stroke="url(#vibe-gradient)"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        className="hover:stroke-8 transition-all duration-200"
        style={prefersReduced ? {} : { pathLength }}
      />
      {/* Linear-gradient driven by first/last moment colors (fallback gray) */}
      <defs>
        <linearGradient id="vibe-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={moments[0]?.color ?? '#9ca3af'}
            stopOpacity="1"
          />
          <stop
            offset="100%"
            stopColor={
              moments[moments.length - 1]?.color ?? moments[0]?.color ?? '#9ca3af'
            }
            stopOpacity="1"
          />
        </linearGradient>
      </defs>
    </svg>
  );
};