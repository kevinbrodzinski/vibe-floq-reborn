import { useRef } from 'react';
import { useMotionValue } from 'framer-motion';
import { useTimelineNavigation } from '@/hooks/useTimelineNavigation';
import { useTimelineProgress } from '@/hooks/useTimelineProgress';
import { TimelineScrubber } from '@/components/timeline/TimelineScrubber';
import { AfterglowMomentCard } from '@/components/AfterglowMomentCard';

interface EnhancedTimelineProps {
  moments: any[]; // your existing moment shape
}

export function EnhancedTimeline({ moments }: EnhancedTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, currentMomentIndex } = useTimelineProgress(
    containerRef,
    moments,
  );

  /* sync framer-motion value so scrubber can animate both ways */
  const progressMV = useMotionValue(scrollProgress);

  /* jump handler used by keyboard / touch & scrubber */
  const jump = (idx: number) => {
    const el = document.querySelector(
      `[data-moment-index='${idx}']`,
    ) as HTMLElement | null;
    if (el) {
      const reduce =
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  /* keyboard & swipe */
  useTimelineNavigation({
    total: moments.length,
    current: currentMomentIndex,
    onJump: jump,
  });

  return (
    <div ref={containerRef} className="space-y-16 pb-32">
      {/* timeline cards */}
      {moments.map((m, i) => (
        <AfterglowMomentCard key={m.id} moment={m} index={i} data-moment-index={i} />
      ))}

      {/* scrubber */}
      <TimelineScrubber
        progress={scrollProgress}
        onSeek={pct => {
          progressMV.set(pct);
          jump(Math.round(pct * (moments.length - 1)));
        }}
        moments={moments.map(m => ({
          title: m.title,
          color: m.color ?? 'hsl(var(--primary))',
        }))}
      />
    </div>
  );
}