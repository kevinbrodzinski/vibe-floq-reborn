import { useRef } from 'react';
import { useMotionValue } from 'framer-motion';
import { DynamicTimelinePath } from '@/components/timeline/DynamicTimelinePath';
import { TimelineScrubber } from '@/components/timeline/TimelineScrubber';
import { useTimelineNavigation } from '@/hooks/useTimelineNavigation';
import type { AfterglowMoment } from '@/hooks/useAfterglowData';

interface EnhancedTimelineProps {
  moments: AfterglowMoment[];
}

export function EnhancedTimeline({ moments }: EnhancedTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Create motion values for the new scrubber
  const progress = useMotionValue(0);
  
  // Add keyboard and touch navigation with proper current index
  useTimelineNavigation({ 
    total: moments.length,
    current: 0, // TODO: Wire to useTimelineProgress().currentMomentIndex
    onJump: (index) => {
      if (typeof document === 'undefined') return;
      const el = document.querySelector(`[data-moment-index='${index}']`);
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (el) el.scrollIntoView({ 
        behavior: prefersReduced ? 'auto' : 'smooth', 
        block: 'center' 
      });
      // Update progress for scrubber
      progress.set(index / Math.max(1, moments.length - 1));
    }
  });

  return (
    <aside
      ref={containerRef}
      className="pointer-events-none fixed left-0 top-0 h-full w-12 lg:w-16"
    >
      <DynamicTimelinePath
        containerRef={containerRef}
        moments={moments}
      />
      <TimelineScrubber
        progress={progress.get()}
        onSeek={(pct) => {
          const index = Math.round(pct * (moments.length - 1));
          const el = document.querySelector(`[data-moment-index='${index}']`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        moments={moments.map(m => ({ title: m.title, color: m.color }))}
      />
    </aside>
  );
}