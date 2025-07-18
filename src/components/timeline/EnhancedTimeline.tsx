import { useRef } from 'react';
import { DynamicTimelinePath } from '@/components/timeline/DynamicTimelinePath';
import TimelineScrubber from '@/components/timeline/TimelineScrubber';
import { useTimelineNavigation } from '@/hooks/useTimelineNavigation';
import type { AfterglowMoment } from '@/hooks/useAfterglowData';

interface EnhancedTimelineProps {
  moments: AfterglowMoment[];
}

export function EnhancedTimeline({ moments }: EnhancedTimelineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Add keyboard and touch navigation
  useTimelineNavigation({ 
    total: moments.length,
    current: 0, // This would be calculated based on current scroll position
    onJump: (index) => {
      const el = document.querySelector(`[data-moment-index='${index}']`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        count={moments.length}
        current={0}
        onJump={(index) => {
          const el = document.querySelector(`[data-moment-index='${index}']`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        moments={moments.map(m => ({ title: m.title, color: m.color }))}
      />
    </aside>
  );
}