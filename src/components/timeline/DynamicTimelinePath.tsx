import { useScroll, useTransform, motion } from 'framer-motion';
import { useMemo, RefObject } from 'react';
import { buildTimelinePath } from '@/utils/buildTimelinePath';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface DynamicTimelinePathProps {
  containerRef: RefObject<HTMLElement>;
  moments: any[];
}

export const DynamicTimelinePath = ({ containerRef, moments }: DynamicTimelinePathProps) => {
  const { scrollYProgress } = useScroll({ target: containerRef });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const prefersReduced = usePrefersReducedMotion();

  const d = useMemo(() => buildTimelinePath(moments), [moments]);

  if (moments.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      width={16}
      height={moments.length * 120}
      className="absolute left-2 top-0 select-none pointer-events-none z-10"
    >
      <defs>
        <linearGradient id="vibeGradient" x1="0" y1="0" x2="0" y2="100%">
          {moments.map((m, i) => (
            <stop
              key={i}
              offset={`${(i / Math.max(1, moments.length - 1)) * 100}%`}
              stopColor={m.vibe_palette?.[0] ?? 'hsl(var(--primary))'}
            />
          ))}
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        strokeWidth={4}
        stroke="url(#vibeGradient)"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 1"
        {...(!prefersReduced && { style: { pathLength } })}
      />
    </svg>
  );
};