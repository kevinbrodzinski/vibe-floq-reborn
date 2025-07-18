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
  const momentElementsRef = useRef<Set<Element>>(new Set());

  const updateScrollProgress = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
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
        
        // Calculate visibility ratio
        const rect = entry.boundingClientRect;
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const visibleHeight = Math.min(rect.bottom, containerRect.bottom) - 
                               Math.max(rect.top, containerRect.top);
          const visibility = visibleHeight / rect.height;
          
          if (visibility > maxVisibility) {
            maxVisibility = visibility;
            mostVisibleIndex = index;
          }
        }
      }
    });

    setState(prev => ({
      ...prev,
      visibleMoments: visibleMoments.sort((a, b) => a - b),
      currentMomentIndex: mostVisibleIndex
    }));
  }, [containerRef]);

  useEffect(() => {
    setState(prev => ({ ...prev, totalMoments: moments.length }));
  }, [moments.length]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    // Set up scroll listener
    container.addEventListener('scroll', updateScrollProgress, { passive: true });
    
    // Set up intersection observer for moment visibility
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: container,
      rootMargin: '-20% 0px -20% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    // Observe all moment elements
    const momentElements = container.querySelectorAll('[data-moment-index]');
    momentElements.forEach((element) => {
      observerRef.current?.observe(element);
      momentElementsRef.current.add(element);
    });

    // Initial scroll progress calculation
    updateScrollProgress();

    return () => {
      container.removeEventListener('scroll', updateScrollProgress);
      if (observerRef.current) {
        momentElementsRef.current.forEach((element) => {
          observerRef.current?.unobserve(element);
        });
        observerRef.current.disconnect();
      }
      momentElementsRef.current.clear();
    };
  }, [containerRef, updateScrollProgress, handleIntersection]);

  return state;
}