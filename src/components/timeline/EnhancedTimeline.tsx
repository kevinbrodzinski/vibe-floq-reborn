/* ──────────────────────────────────────────────
   EnhancedTimeline
   – smooth scroll + keyboard / swipe navigation
   – vertical path + horizontal scrubber
────────────────────────────────────────────── */
import {
  useRef,
  useEffect,
  useCallback,
  memo,
} from 'react';
import { motion, useMotionValue } from 'framer-motion';

import { DynamicTimelinePath }  from '@/components/timeline/DynamicTimelinePath';
import { TimelineScrubber }     from '@/components/timeline/TimelineScrubber';
import { useTimelineNavigation } from '@/hooks/useTimelineNavigation';
import { useTimelineProgress }   from '@/hooks/useTimelineProgress';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { AfterglowMomentCard }   from '@/components/AfterglowMomentCard';
import type { AfterglowMoment }  from '@/types/afterglow';

interface EnhancedTimelineProps {
  moments: AfterglowMoment[];
}

/**
 * NOTE – The component **always** calls every hook on every render.
 * If there are no moments we bail out *after* the hooks have run,
 * which preserves React’s hook ordering contract and fixes the
 * “Rendered fewer hooks than expected” runtime error.
 */
export const EnhancedTimeline = memo(function EnhancedTimeline ({
  moments,
}: EnhancedTimelineProps) {
  /* ──────────────────────────────────────────
     1. Refs / basic state
  ────────────────────────────────────────── */
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  /* ──────────────────────────────────────────
     2. Scroll-progress → index mapping
  ────────────────────────────────────────── */
  const {
    scrollProgress,
    currentMomentIndex,
  } = useTimelineProgress(containerRef, moments);

  /* ──────────────────────────────────────────
     3. Framer-motion value (stable instance)
  ────────────────────────────────────────── */
  const progressMV = useMotionValue(scrollProgress);

  /* keep MV in sync without creating a new one */
  useEffect(() => {
    progressMV.set(scrollProgress);
  }, [scrollProgress, progressMV]);

  /* ──────────────────────────────────────────
     4. Jump helpers  (index  ↔︎ percentage)
  ────────────────────────────────────────── */
  const jumpToIndex = useCallback(
    (idx: number) => {
      const el = document.querySelector(
        `[data-moment-index='${idx}']`,
      ) as HTMLElement | null;

      if (el) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block:    'center',
        });
      }
    },
    [prefersReducedMotion],
  );

  const jumpToPct = useCallback(
    (pct: number) => {
      if (moments.length === 0) return;
      const idx = Math.round(pct * (moments.length - 1));
      jumpToIndex(idx);
    },
    [moments.length, jumpToIndex],
  );

  /* ──────────────────────────────────────────
     5. Keyboard / swipe navigation
  ────────────────────────────────────────── */
  useTimelineNavigation({
    total:   moments.length,
    current: currentMomentIndex,
    onJump:  jumpToIndex,
  });

  /* ──────────────────────────────────────────
     6. If there’s nothing to show, render null
        (hooks have already run – safe)
  ────────────────────────────────────────── */
  if (moments.length === 0) return null;

  /* ──────────────────────────────────────────
     7. Render
  ────────────────────────────────────────── */
  return (
    <>
      {/* scrollable wrapper – needed for IntersectionObservers */}
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

        {/* individual moment cards */}
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
            title: m.title  ?? 'Moment',
            color: m.color ?? 'hsl(var(--primary))',
          }))}
        />
      )}
    </>
  );
});