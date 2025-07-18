import { useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { DynamicTimelinePath } from '@/components/timeline/DynamicTimelinePath';
import { TimelineScrubber } from '@/components/timeline/TimelineScrubber';
import { useTimelineNavigation } from '@/hooks/useTimelineNavigation';
import { useTimelineProgress } from '@/hooks/useTimelineProgress';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { AfterglowMomentCard } from '@/components/AfterglowMomentCard';
import type { AfterglowMoment } from '@/types/afterglow';

interface EnhancedTimelineProps {
  moments: AfterglowMoment[];
}

export function EnhancedTimeline({ moments }: EnhancedTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* ──────────────────────────────────────────────
     1. scroll progress / current moment
  ────────────────────────────────────────────── */
  const { scrollProgress, currentMomentIndex } = useTimelineProgress(
    containerRef,
    moments,
  );

  /* ──────────────────────────────────────────────
     2. scrubber motion-value (kept in sync)
  ────────────────────────────────────────────── */
  const progressMV = useMotionValue(scrollProgress);
  progressMV.set(scrollProgress); // keep MV fresh every render

  /* ──────────────────────────────────────────────
     3. jumping helpers
  ────────────────────────────────────────────── */
  const prefersReduced = usePrefersReducedMotion();

  const jumpToIndex = (idx: number) => {
    const el = document.querySelector(
      `[data-moment-index='${idx}']`,
    ) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  };

  const jumpToPct = (pct: number) => {
    const idx = Math.round(pct * (moments.length - 1));
    jumpToIndex(idx);
  };

  /* ──────────────────────────────────────────────
     4. keyboard / swipe navigation hook
  ────────────────────────────────────────────── */
  useTimelineNavigation({
    total: moments.length,
    current: currentMomentIndex,
    onJump: jumpToIndex,
  });

  /* ──────────────────────────────────────────────
     5. render
  ────────────────────────────────────────────── */
  return (
    <>
      {/* scrollable wrapper gets the ref for IO tracking */}
      <div
        ref={containerRef}
        className="relative flex flex-col gap-12 pb-24"
      >
        {/* vertical connecting spline */}
        <DynamicTimelinePath
          containerRef={containerRef}
          mode="geometry"
          moments={moments}
        />

        {/* moment cards */}
        {moments.map((m, i) => (
          <div
            key={m.id ?? i}
            data-moment-index={i}
            className="afterglow-moment-anchor"
          >
            <AfterglowMomentCard moment={m} index={i} />
          </div>
        ))}
      </div>

      {/* horizontal scrubber helper */}
      {moments.length > 1 && (
        <TimelineScrubber
          className="sticky bottom-4 mx-auto max-w-[480px]"
          progressVal={progressMV}
          onSeek={jumpToPct}
          moments={moments.map(m => ({
            title: m.title || 'Moment',
            color: m.color || 'hsl(var(--primary))',
          }))}
        />
      )}
    </>
  );
}