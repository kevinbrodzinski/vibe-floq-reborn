import { useState, useEffect, useCallback, useRef } from 'react';

interface TimelineProgressState {
  scrollProgress: number;
  currentMomentIndex: number;
  visibleMoments: number[];
  totalMoments: number;
}

export function useTimelineProgress(containerRef: React.RefObject<HTMLElement>, moments: any[]) {
  const [state, setState] = useState<TimelineProgressState>({
    scrollProgress: 0,
    currentMomentIndex: 0,
    visibleMoments: [],
    totalMoments: moments.length
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<Element>>(new Set());

  const updateScrollProgress = useCallback(() => {
    const scroller = containerRef.current ?? document.documentElement;
    const scrollTop = scroller.scrollTop;
    const scrollHeight = scroller.scrollHeight - scroller.clientHeight;
    const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

    setState(prev => ({
      ...prev,
      scrollProgress: progress
    }));
  }, [containerRef]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const visibleMoments: number[] = [];
    let mostVisibleIndex = 0;
    let maxVisibility = 0;

    entries.forEach((entry) => {
      const index = parseInt(entry.target.getAttribute('data-moment-index') || '0');
      
      if (entry.isIntersecting) {
        visibleMoments.push(index);
        
        // Use built-in intersectionRatio - faster and more reliable
        const visibility = entry.intersectionRatio;
        
        if (visibility > maxVisibility) {
          maxVisibility = visibility;
          mostVisibleIndex = index;
        }
      }
    });

    setState(prev => ({
      ...prev,
      visibleMoments: visibleMoments.sort((a, b) => a - b),
      currentMomentIndex: mostVisibleIndex
    }));
  }, []);

  useEffect(() => {
    setState(prev => ({ ...prev, totalMoments: moments.length }));
  }, [moments.length]);

  useEffect(() => {
    const scroller = containerRef.current ?? document.documentElement;
    if (!scroller) return;
    
    // Set up scroll listener with iOS PWA fallback
    scroller.addEventListener('scroll', updateScrollProgress, { passive: true });
    
    // Set up intersection observer with single threshold for performance
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: containerRef.current,
      rootMargin: '-20% 0px -20% 0px',
      threshold: [0.5] // Single threshold for better performance
    });

    // Observe moment elements and track them for cleanup
    const momentElements = scroller.querySelectorAll('[data-moment-index]');
    momentElements.forEach((element) => {
      observerRef.current?.observe(element);
      observedElementsRef.current.add(element);
    });

    // Initial scroll progress calculation
    updateScrollProgress();

    return () => {
      scroller.removeEventListener('scroll', updateScrollProgress);
      if (observerRef.current) {
        // Clean up all observed elements
        observedElementsRef.current.forEach((element) => {
          observerRef.current?.unobserve(element);
        });
        observerRef.current.disconnect();
      }
      observedElementsRef.current.clear();
    };
  }, [containerRef, updateScrollProgress, handleIntersection, moments.length]); // Added moments.length dependency

  return state;
}