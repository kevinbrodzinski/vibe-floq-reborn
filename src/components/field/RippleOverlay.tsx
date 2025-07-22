import { useRef, useEffect, useCallback } from 'react';

/**
 * Imperative helper:
 *   pass (x, y) in screen-pixels -> adds a ripple into the queue.
 *
 * The queue is processed by RippleEffect.ts (already wired into a PIXI
 * post-processing filter elsewhere), so FieldCanvas only has to enqueue.
 */
export const useAddRipple = () => {
  const rippleQueue = useRef<Array<{ x: number; y: number; t: number }>>([]);
  
  const add = useCallback((x: number, y: number) => {
    rippleQueue.current.push({ x, y, t: performance.now() });
  }, []);

  return add;
};

/* Optional debug overlay that shows where ripples are queued */
export const RippleDebug: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);
  const add = useAddRipple();

  /* Click-to-test */
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const click = (e: MouseEvent) => add(e.clientX, e.clientY);
    el.addEventListener('click', click);
    return () => el.removeEventListener('click', click);
  }, [add]);

  return (
    <div
      ref={container}
      className="absolute inset-0 z-50 pointer-events-auto"
    />
  );
};