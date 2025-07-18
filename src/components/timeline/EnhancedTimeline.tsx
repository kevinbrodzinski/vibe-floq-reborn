import { useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  
  // Track scroll progress and current moment
  const { scrollProgress, currentMomentIndex } = useTimelineProgress(
    containerRef,
    moments,
  );

  // Jump helper used by keyboard / scrubber
  const jumpToPct = (pct: number) => {
    const idx = Math.round(pct * (moments.length - 1));
    jumpToIndex(idx);
  };

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

  // Add keyboard and touch navigation
  useTimelineNavigation({ 
    total: moments.length,
    current: currentMomentIndex,
    onJump: jumpToIndex
  });

  return (
    <>
      {/* Vertical scrollable timeline */}
      <main
        ref={containerRef}
        className="relative space-y-8 overflow-y-auto scroll-smooth"
      >
        {/* Connecting line */}
        <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-accent to-secondary opacity-30" />
        
        {/* Moment cards */}
        {moments.map((moment, index) => (
          <AfterglowMomentCard 
            key={moment.id} 
            moment={moment} 
            index={index}
            data-moment-index={index}
          />
        ))}
      </main>

      {/* Horizontal scrub helper */}
      {moments.length > 1 && (
        <TimelineScrubber
          progress={scrollProgress}
          onSeek={jumpToPct}
          moments={moments.map(m => ({ 
            title: m.title, 
            color: m.color || 'hsl(var(--primary))' 
          }))}
        />
      )}
    </>
  );
}