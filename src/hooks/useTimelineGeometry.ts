import { useMemo, useLayoutEffect, useState, RefObject } from 'react';

export interface PathPoint {
  x: number;
  y: number;
  color: string;
  intensity: number;
}

interface UseTimelineGeometryOptions {
  containerRef: RefObject<HTMLElement>;
  moments: any[];
  enabled?: boolean;
}

export function useTimelineGeometry({ 
  containerRef, 
  moments, 
  enabled = true 
}: UseTimelineGeometryOptions) {
  const [momentPositions, setMomentPositions] = useState<{ y: number; height: number }[]>([]);

  // Measure moment positions after layout
  useLayoutEffect(() => {
    if (!enabled || !containerRef.current || moments.length === 0) {
      setMomentPositions([]);
      return;
    }

    const container = containerRef.current;
    const momentElements = container.querySelectorAll('[data-moment-index]');
    const containerRect = container.getBoundingClientRect();
    
    const positions = Array.from(momentElements).map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        y: rect.top - containerRect.top + container.scrollTop + rect.height / 2,
        height: rect.height
      };
    });

    setMomentPositions(positions);

    // Re-measure on resize
    const resizeObserver = new ResizeObserver(() => {
      const newPositions = Array.from(momentElements).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          y: rect.top - containerRect.top + container.scrollTop + rect.height / 2,
          height: rect.height
        };
      });
      setMomentPositions(newPositions);
    });

    momentElements.forEach(el => resizeObserver.observe(el));

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, moments.length, enabled]);

  // Generate path points with vibe-based styling
  const pathPoints = useMemo((): PathPoint[] => {
    if (!enabled || momentPositions.length === 0) return [];

    return moments.map((moment, index) => {
      const position = momentPositions[index];
      if (!position) return null;

      const intensity = moment.vibe_intensity ?? 0.5; // 0-1
      const amplitude = 26 * intensity;
      const direction = index % 2 === 0 ? 1 : -1;
      
      // Wiggle effect - gentle sine wave
      const wiggleOffset = Math.sin(index * Math.PI / 3) * 6;
      
      const x = 8 + amplitude * direction + wiggleOffset;
      const y = position.y;
      
      // Map vibe to color - fallback to primary if no vibe palette
      const color = moment.vibe_palette?.[0] ?? 'hsl(var(--primary))';

      return {
        x,
        y,
        color,
        intensity
      };
    }).filter(Boolean) as PathPoint[];
  }, [moments, momentPositions, enabled]);

  // Generate SVG path string
  const pathString = useMemo(() => {
    if (pathPoints.length === 0) return '';
    if (pathPoints.length === 1) {
      const { x, y } = pathPoints[0];
      return `M ${x} ${y}`;
    }

    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    
    for (let i = 1; i < pathPoints.length; i++) {
      const curr = pathPoints[i];
      const prev = pathPoints[i - 1];
      
      // Smooth cubic bezier curves
      const cp1x = prev.x + (curr.x - prev.x) * 0.4;
      const cp1y = prev.y + (curr.y - prev.y) * 0.4;
      const cp2x = curr.x - (curr.x - prev.x) * 0.4;
      const cp2y = curr.y - (curr.y - prev.y) * 0.4;
      
      path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
    }
    
    return path;
  }, [pathPoints]);

  // Generate gradient stops
  const gradientStops = useMemo(() => {
    if (pathPoints.length === 0) return [];
    
    return pathPoints.map((point, index) => ({
      offset: pathPoints.length > 1 ? (index / (pathPoints.length - 1)) * 100 : 50,
      color: point.color
    }));
  }, [pathPoints]);

  return {
    pathString,
    gradientStops,
    pathPoints,
    totalHeight: momentPositions.length > 0 ? Math.max(...momentPositions.map(p => p.y)) + 60 : 0
  };
}