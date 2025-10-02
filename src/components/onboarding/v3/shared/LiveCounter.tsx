import { useEffect, useRef, useState } from 'react';

/**
 * Live Counter - Real-time fluctuating user count with visibility & reduced-motion support
 */
export function LiveCounter({ min = 22, max = 50, periodMs = 3500 }: { min?: number; max?: number; periodMs?: number }) {
  const [value, setValue] = useState(min);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      setValue(prev => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(min, Math.min(max, next));
      });
    }

    function start() {
      if (reduced) return;
      stop();
      timer.current = window.setInterval(tick, periodMs);
    }
    
    function stop() {
      if (timer.current) { 
        clearInterval(timer.current); 
        timer.current = null; 
      }
    }

    function onVisibility() {
      if (typeof document !== 'undefined') {
        if (document.visibilityState === 'visible') start();
        else stop();
      }
    }

    start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    
    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [min, max, periodMs]);

  return <span className="tabular-nums">{value}</span>;
}
