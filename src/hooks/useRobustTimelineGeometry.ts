import { useLayoutEffect, useState, useMemo, useCallback, RefObject } from 'react';

interface MomentGeometry {
  y: number;
  height: number;
  element: Element;
}

interface UseRobustTimelineGeometryOptions {
  containerRef: RefObject<HTMLElement>;
  moments: any[];
  enabled?: boolean;
}

export function useRobustTimelineGeometry({ 
  containerRef, 
  moments, 
  enabled = true 
}: UseRobustTimelineGeometryOptions) {
  const [momentGeometries, setMomentGeometries] = useState<MomentGeometry[]>([]);

  // Dependency key that considers moment changes beyond just length
  const momentsKey = useMemo(() => 
    moments.map(m => `${m.id}-${m.vibe_intensity}`).join(','),
    [moments]
  );

  const measureMoments = useCallback(() => {
    if (!enabled || !containerRef.current || moments.length === 0) {
      setMomentGeometries([]);
      return;
    }

    const container = containerRef.current;
    const momentElements = container.querySelectorAll('[data-moment-index]');
    const containerRect = container.getBoundingClientRect();
    
    // Include current scroll position to avoid stale measurements
    const scrollTop = container.scrollTop;
    
    const geometries: MomentGeometry[] = Array.from(momentElements).map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        y: rect.top - containerRect.top + scrollTop + rect.height / 2,
        height: rect.height,
        element: el
      };
    });

    setMomentGeometries(geometries);
  }, [containerRef, moments.length, enabled]);

  useLayoutEffect(() => {
    if (!enabled) return;

    // Initial measurement
    measureMoments();

    const container = containerRef.current;
    if (!container) return;

    // Use a single ResizeObserver on the container to detect layout changes
    const resizeObserver = new ResizeObserver(() => {
      // Re-query elements and re-measure on any container resize
      measureMoments();
    });

    resizeObserver.observe(container);

    // Also re-measure on scroll to handle dynamic content loading
    const handleScroll = () => {
      measureMoments();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
    };
  }, [measureMoments, enabled, momentsKey]); // Include momentsKey for moment changes

  // Generate path points with enhanced vibe-based styling
  const pathData = useMemo(() => {
    if (!enabled || momentGeometries.length === 0) {
      return { pathString: '', totalHeight: 0 };
    }

    const width = 48;
    const points: Array<{ x: number; y: number }> = [];

    momentGeometries.forEach((geometry, index) => {
      const moment = moments[index];
      if (!moment) return;

      const intensity = moment.vibe_intensity ?? 0.5; // 0-1
      const amplitude = 26 * intensity;
      const direction = index % 2 === 0 ? 1 : -1;
      
      // Enhanced wiggle with intensity-based variation
      const wiggleOffset = Math.sin(index * Math.PI / 3) * (6 + intensity * 4);
      
      const x = width / 2 + amplitude * direction + wiggleOffset;
      const y = geometry.y;
      
      points.push({ x, y });
    });

    // Build path string
    let pathString = '';
    if (points.length > 0) {
      pathString = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        
        // Vary curve tension with moment intensity for more organic feel
        const moment = moments[i];
        const tension = 0.3 + (moment?.vibe_intensity ?? 0.5) * 0.2; // 0.3-0.5
        
        const cp1x = prev.x + (curr.x - prev.x) * tension;
        const cp1y = prev.y + (curr.y - prev.y) * tension;
        const cp2x = curr.x - (curr.x - prev.x) * tension;
        const cp2y = curr.y - (curr.y - prev.y) * tension;
        
        pathString += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
      }
    }

    const totalHeight = points.length > 0 ? Math.max(...points.map(p => p.y)) + 60 : 0;

    return { pathString, totalHeight };
  }, [momentGeometries, moments, enabled]);

  return {
    pathString: pathData.pathString,
    totalHeight: pathData.totalHeight,
    isReady: momentGeometries.length > 0
  };
}