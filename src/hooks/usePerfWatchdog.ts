import { useEffect, useState } from 'react';

export function usePerfWatchdog(sampleMs = 1000, targetFps = 40) {
  const [fps, setFps] = useState(60);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    let frames = 0, start = performance.now(), raf = 0;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const tick = () => {
      // Avoid sampling when tab is in background – RAF is throttled
      if (document.hidden) { frames = 0; start = performance.now(); }
      else frames++;

      const now = performance.now();
      const elapsed = now - start;
      if (elapsed >= sampleMs) {
        const current = Math.round((frames * 1000) / elapsed);
        setFps(current);
        setOk(reduce ? true : current >= targetFps);
        frames = 0; start = now;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [sampleMs, targetFps]);

  return { fps, ok };
}