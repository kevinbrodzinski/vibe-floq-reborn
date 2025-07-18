import { useState, useEffect, useCallback, useRef } from 'react';

interface ScrollContextState {
  currentMoment: any | null;
  scrollVelocity: number;
  scrollDirection: 'up' | 'down' | 'idle';
  momentProgress: number; // Progress through current moment (0-1)
  transitionProgress: number; // Progress between moments (0-1)
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
    transitionProgress: 0
  });

  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const velocityHistory = useRef<number[]>([]);

  const calculateContext = useCallback(() => {
    if (!containerRef.current || moments.length === 0) return;

    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const currentTime = Date.now();
    
    // Calculate velocity
    const deltaTime = currentTime - lastScrollTime.current;
    const deltaScroll = scrollTop - lastScrollTop.current;
    const velocity = deltaTime > 0 ? Math.abs(deltaScroll / deltaTime) : 0;
    
    // Smooth velocity with history
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
    
    // Calculate moment progress
    const currentMoment = moments[currentMomentIndex];
    const nextMoment = moments[currentMomentIndex + 1];
    
    let momentProgress = 0;
    let transitionProgress = 0;
    
    if (currentMoment) {
      const currentElement = container.querySelector(`[data-moment-index="${currentMomentIndex}"]`);
      if (currentElement) {
        const elementRect = currentElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate how much of the current moment is visible
        const visibleTop = Math.max(elementRect.top, containerRect.top);
        const visibleBottom = Math.min(elementRect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        momentProgress = Math.min(1, visibleHeight / elementRect.height);
        
        // Calculate transition progress if we have a next moment
        if (nextMoment) {
          const scrollProgress = (containerRect.top - elementRect.top) / elementRect.height;
          transitionProgress = Math.max(0, Math.min(1, scrollProgress));
        }
      }
    }

    setContext({
      currentMoment,
      scrollVelocity: smoothVelocity,
      scrollDirection: direction,
      momentProgress,
      transitionProgress
    });

    lastScrollTop.current = scrollTop;
    lastScrollTime.current = currentTime;
  }, [containerRef, moments, currentMomentIndex]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let animationFrame: number;

    const handleScroll = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(calculateContext);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initial calculation
    calculateContext();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(animationFrame);
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