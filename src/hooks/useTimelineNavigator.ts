import { useCallback } from 'react';
import { useTimelineProgress } from './useTimelineProgress';
import { useTimelineNavigation } from './useTimelineNavigation';

interface NavigatorOptions { 
  total: number; 
  container: React.RefObject<HTMLElement>; 
}

export function useTimelineNavigator(opts: NavigatorOptions) {
  const { currentMomentIndex, scrollProgress } = useTimelineProgress(opts.container, []);
  
  const jumpTo = useCallback((idx: number) => {
    const el = opts.container.current?.querySelector(`[data-moment-index="${idx}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [opts.container]);

  // Enable keyboard and touch navigation (single source of truth)
  useTimelineNavigation({
    total: opts.total,
    current: currentMomentIndex,
    onJump: jumpTo
  });

  return { currentMomentIndex, jumpTo, scrollProgress };
}