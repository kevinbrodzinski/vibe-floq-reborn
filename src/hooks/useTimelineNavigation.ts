import { useEffect } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export interface TimelineNavigationOptions {
  /** total # of moments in the current afterglow */
  total: number;
  /** zero-based index of the moment currently in view */
  current: number;
  /** callback -> jump to an absolute index  */
  onJump: (index: number) => void;
}

/**
 * Keyboard ← / →  and mobile-swipe navigation that calls `onJump`.
 * Nothing happens when `total <= 1`.
 */
export function useTimelineNavigation({
  total,
  current,
  onJump,
}: TimelineNavigationOptions) {
  const prefersReduced = usePrefersReducedMotion();
  if (total <= 1) return;

  /* ───────────────────────── keyboard ( ← / → ) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;

      const next =
        e.key === 'ArrowRight'
          ? Math.min(total - 1, current + 1)
          : Math.max(0, current - 1);

      if (next !== current) {
        e.preventDefault();
        onJump(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, total, onJump]);

  /* ───────────────────────── touch swipe (mobile) */
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    };

    const end = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 40 && Math.abs(dy) < 30) {
        const next = Math.max(
          0,
          Math.min(total - 1, current + (dx < 0 ? 1 : -1)),
        );
        if (next !== current) onJump(next);
      }
    };

    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchend', end);
    };
  }, [current, total, onJump, prefersReduced]);
}