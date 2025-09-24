
import { useEffect, useState, useRef } from 'react';

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function useViewportBounds(canvasRef: React.RefObject<HTMLCanvasElement>): ViewportBounds {
  const [bounds, setBounds] = useState<ViewportBounds>({
    minX: 0,
    minY: 0,
    maxX: window.innerWidth,
    maxY: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  const animationFrameRef = useRef<number>();
  const lastBoundsRef = useRef<ViewportBounds>(bounds);

  useEffect(() => {
    if (!canvasRef.current) return;

    const updateBounds = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const newBounds = {
        minX: 0,
        minY: 0,
        maxX: rect.width,
        maxY: rect.height,
        width: rect.width,
        height: rect.height,
      };

      // Only update state if bounds actually changed
      const lastBounds = lastBoundsRef.current;
      if (
        newBounds.width !== lastBounds.width ||
        newBounds.height !== lastBounds.height ||
        newBounds.maxX !== lastBounds.maxX ||
        newBounds.maxY !== lastBounds.maxY
      ) {
        lastBoundsRef.current = newBounds;
        setBounds(newBounds);
      }

      animationFrameRef.current = requestAnimationFrame(updateBounds);
    };

    // Start the update loop
    updateBounds();

    // Debounced resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateBounds();
      }, 250);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef]);

  return bounds;
}
