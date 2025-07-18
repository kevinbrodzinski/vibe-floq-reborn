
import { useEffect, useState, useRef } from 'react';

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function useViewportBounds(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const [bounds, setBounds] = useState<ViewportBounds>({
    minX: 0,
    minY: 0,
    maxX: window.innerWidth,
    maxY: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  const animationFrameRef = useRef<number>();

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

      setBounds(newBounds);
      animationFrameRef.current = requestAnimationFrame(updateBounds);
    };

    // Start the update loop
    updateBounds();

    // Also update on resize
    const handleResize = () => {
      updateBounds();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef]);

  return bounds;
}
