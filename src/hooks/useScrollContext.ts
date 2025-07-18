import { useState, useEffect, useCallback, useRef } from 'react';

interface ScrollContextState {
  currentMoment: any | null;
  scrollVelocity: number;
  scrollDirection: 'up' | 'down' | 'idle';
  momentProgress: number; // Progress through current moment (0-1)
  transitionProgress: number; // Progress between moments (0-1)
  isScrolling: boolean;
}

export function useScrollContext(
  containerRef: React.RefObject<HTMLElement>, 
  moments: any[],
  currentMomentIndex: number
) {
  const [context, setContext] = useState<ScrollContextState>({
    currentMoment: moments[0] || null,
    scrollVelocity: 0,
    scrollDirection: 'idle',
    momentProgress: 0,
    transitionProgress: 0,
    isScrolling: false
  });

  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const velocityHistory = useRef<number[]>([]);
  const elementCacheRef = useRef<Record<number, HTMLElement>>({});
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateContext = useCallback(() => {
    const scroller = containerRef.current ?? document.documentElement;
    if (!scroller || moments.length === 0) return;

    const scrollTop = scroller.scrollTop;
    const currentTime = Date.now();
    
    // Calculate velocity
    const deltaTime = currentTime - lastScrollTime.current;
    const deltaScroll = scrollTop - lastScrollTop.current;
    const velocity = deltaTime > 0 ? Math.abs(deltaScroll / deltaTime) : 0;
    
    // Smooth velocity with capped history
    velocityHistory.current.push(velocity);
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift();
    }
    const smoothVelocity = velocityHistory.current.reduce((a, b) => a + b, 0) / velocityHistory.current.length;
    
    // Determine direction
    let direction: 'up' | 'down' | 'idle' = 'idle';
    if (Math.abs(deltaScroll) > 1) {
      direction = deltaScroll > 0 ? 'down' : 'up';
    }
    
    // iOS momentum scroll detection
    const isScrolling = smoothVelocity > 0.1;
    if (isScrolling) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setContext(prev => ({ ...prev, isScrolling: false }));
      }, 150);
    }
    
    // Calculate moment progress using cached elements
    const currentMoment = moments[currentMomentIndex];
    let momentProgress = 0;
    let transitionProgress = 0;
    
    if (currentMoment) {
      // Cache element reference
      if (!elementCacheRef.current[currentMomentIndex]) {
        const element = scroller.querySelector(`[data-moment-index="${currentMomentIndex}"]`) as HTMLElement;
        if (element) {
          elementCacheRef.current[currentMomentIndex] = element;
        }
      }
      
      const currentElement = elementCacheRef.current[currentMomentIndex];
      if (currentElement) {
        const elementRect = currentElement.getBoundingClientRect();
        const containerRect = scroller.getBoundingClientRect();
        
        // Calculate how much of the current moment is visible (fix edge case)
        const visibleTop = Math.max(elementRect.top, containerRect.top);
        const visibleBottom = Math.min(elementRect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const maxHeight = Math.min(elementRect.height, containerRect.height); // Clamp to viewport height
        momentProgress = Math.min(1, visibleHeight / maxHeight);
        
        // Calculate transition progress
        const nextMoment = moments[currentMomentIndex + 1];
        if (nextMoment) {
          const scrollProgress = (containerRect.top - elementRect.top) / elementRect.height;
          transitionProgress = Math.max(0, Math.min(1, scrollProgress));
        }
      }
    }

    setContext(prev => ({
      ...prev,
      currentMoment,
      scrollVelocity: smoothVelocity,
      scrollDirection: direction,
      momentProgress,
      transitionProgress,
      isScrolling
    }));

    lastScrollTop.current = scrollTop;
    lastScrollTime.current = currentTime;
  }, [containerRef, moments, currentMomentIndex]);

  useEffect(() => {
    const scroller = containerRef.current ?? document.documentElement;
    if (!scroller) return;

    let animationFrame: number;

    const handleScroll = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(calculateContext);
    };

    scroller.addEventListener('scroll', handleScroll, { passive: true });

    // Initial calculation
    calculateContext();

    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrame);
      clearTimeout(scrollTimeoutRef.current);
      // Clear element cache on cleanup
      elementCacheRef.current = {};
    };
  }, [calculateContext]);

  // Update current moment when index changes
  useEffect(() => {
    if (moments[currentMomentIndex]) {
      setContext(prev => ({
        ...prev,
        currentMoment: moments[currentMomentIndex]
      }));
    }
  }, [currentMomentIndex, moments]);

  return context;
}