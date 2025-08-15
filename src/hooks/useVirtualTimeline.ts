import { useState, useEffect, useMemo, useCallback } from 'react';
import type { PlanStop } from '@/types/plan';

interface VirtualTimelineOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  timeSlot: string;
  stop?: PlanStop;
  offsetTop: number;
}

export function useVirtualTimeline(
  timeSlots: string[],
  stops: PlanStop[],
  options: VirtualTimelineOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate which items are visible
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(timeSlots.length - 1, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, timeSlots.length, overscan]);

  // Create virtual items for visible range
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      const timeSlot = timeSlots[i];
      const stop = stops.find(s => s.start_time?.startsWith(timeSlot));
      
      items.push({
        index: i,
        timeSlot,
        stop,
        offsetTop: i * itemHeight
      });
    }
    
    return items;
  }, [visibleRange, timeSlots, stops, itemHeight]);

  // Total height for scrolling
  const totalHeight = timeSlots.length * itemHeight;

  // Scroll handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // Scroll to specific time slot
  const scrollToTimeSlot = useCallback((timeSlot: string) => {
    const index = timeSlots.findIndex(slot => slot === timeSlot);
    if (index !== -1) {
      setScrollTop(index * itemHeight);
    }
  }, [timeSlots, itemHeight]);

  // Scroll to specific stop
  const scrollToStop = useCallback((stopId: string) => {
    const stop = stops.find(s => s.id === stopId);
    if (stop && stop.start_time) {
      const timeSlot = stop.start_time.substring(0, 5); // Extract HH:MM
      scrollToTimeSlot(timeSlot);
    }
  }, [stops, scrollToTimeSlot]);

  return {
    virtualItems,
    totalHeight,
    scrollTop,
    handleScroll,
    scrollToTimeSlot,
    scrollToStop,
    visibleRange
  };
}

// Performance monitoring hook
export function useTimelinePerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    scrollPerformance: 0,
    memoryUsage: 0
  });

  const measureRender = useCallback((callback: () => void) => {
    const start = performance.now();
    callback();
    const end = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderTime: end - start
    }));
  }, []);

  const measureScroll = useCallback((callback: () => void) => {
    const start = performance.now();
    callback();
    const end = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      scrollPerformance: end - start
    }));
  }, []);

  // Monitor memory usage (if available)
  useEffect(() => {
    if ('memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
        }));
      };

      const interval = setInterval(updateMemory, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, []);

  return {
    metrics,
    measureRender,
    measureScroll
  };
}