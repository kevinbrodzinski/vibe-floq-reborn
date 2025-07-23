import { useCallback, useEffect, useRef } from 'react';

export type HapticPattern =
  | 'light' | 'medium' | 'heavy'
  | 'success' | 'warning' | 'error'
  | 'selection' | 'impact' | 'notification';

interface Options { enabled?: boolean; throttle?: number; }

/* Simple UA helper reused elsewhere */
const isMobile = () =>
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
   (typeof window !== 'undefined' && 'ontouchstart' in window));

export function useAdvancedHaptics({ enabled = true, throttle = 100 }: Options = {}) {
  const last = useRef<number>(0);
  const ctxRef = useRef<AudioContext | null>(null);

  /* ensure single AudioContext */
  const getCtx = () => {
    if (!ctxRef.current) {
      try { ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); }
      catch { /* ignore */ }
    }
    return ctxRef.current;
  };

  const triggerHaptic = useCallback(
    (pattern: HapticPattern) => {
      if (!enabled || !isMobile()) return;
      const now = Date.now();
      if (now - last.current < throttle) return;
      last.current = now;

      /* --- native Vibration API ------------------------------------ */
      if ('vibrate' in navigator) {
        const map: Record<HapticPattern, number | number[]> = {
          light: 10, medium: 20, heavy: 40,
          success: [10, 50, 10], warning: [20, 100, 20], error: [50, 50, 50],
          selection: 5, impact: 25, notification: [10, 30, 10, 30, 10]
        };
        navigator.vibrate(map[pattern] ?? 10);
      }

      /* --- subtle audio cue (Safari / iOS PWAs) -------------------- */
      const ctx = getCtx();
      if (!ctx) return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const freq: Record<HapticPattern, number> =
          { light: 900, medium: 700, heavy: 500, success: 1000,
            warning: 800, error: 300, selection: 1100, impact: 600, notification: 950 };

        osc.frequency.value = freq[pattern] ?? 800;
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch { /* ignore */ }
    },
    [enabled, throttle]
  );

  /* cleanup */
  useEffect(() => {
    const clear = () => { ctxRef.current?.close().catch(() => {}); ctxRef.current = null; };
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);

  return { 
    triggerHaptic,
    // Convenience methods to maintain backward compatibility
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    warning: () => triggerHaptic('warning'),
    error: () => triggerHaptic('error'),
    // Legacy API compatibility
    timelineHaptics: {
      start: () => triggerHaptic('light'),
      stop: () => triggerHaptic('medium'),
      change: () => triggerHaptic('selection'),
      stopDragStart: () => triggerHaptic('light'),
      stopResize: () => triggerHaptic('selection'),
      stopDragEnd: () => triggerHaptic('medium'),
      stopCreate: () => triggerHaptic('success'),
      stopConflict: () => triggerHaptic('warning')
    },
    contextualHaptics: {
      plan: () => triggerHaptic('success'),
      error: () => triggerHaptic('error'),
      complete: () => triggerHaptic('success'),
      confirmation: () => triggerHaptic('success'),
      cancellation: () => triggerHaptic('warning')
    }
  };
}