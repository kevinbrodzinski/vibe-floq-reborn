import { useEffect, useRef, useState } from 'react';

/**
 * Live Counter - Real-time fluctuating user count with visibility & reduced-motion support
 */
export function LiveCounter({ min = 22, max = 50, periodMs = 3500 }: { min?: number; max?: number; periodMs?: number }) {
  const [value, setValue] = useState(min);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      setValue(prev => {
        const next = prev + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(min, Math.min(max, next));
      });
    }

    function start() {
      if (reduced || timerRef.current) return;
      timerRef.current = window.setInterval(tick, periodMs);
    }
    
    function stop() {
      if (timerRef.current) { 
        clearInterval(timerRef.current); 
        timerRef.current = null; 
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') start();
      else stop();
    }

    start();
    document.addEventListener('visibilitychange', onVisibility);
    
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [min, max, periodMs]);

  return <span className="tabular-nums">{value}</span>;
}
