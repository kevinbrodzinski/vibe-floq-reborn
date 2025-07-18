import { useEffect } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface TimelineNavigationOptions {
  /** total number of moments on the page */
  total: number;
  /** index of the moment that is currently most-visible */
  current: number;
  /** seek handler – jump to the given moment index */
  onJump: (index: number) => void;
}

export function useTimelineNavigation({
  total,
  current,
  onJump,
}: TimelineNavigationOptions) {
  const prefersReduced = usePrefersReducedMotion();

  // ──────────────────────────────────
  //  keyboard navigation ( ← / → )
  // ──────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      let targetIdx = current;
      if (e.key === 'ArrowRight') targetIdx = Math.min(total - 1, current + 1);
      if (e.key === 'ArrowLeft')  targetIdx = Math.max(0, current - 1);
      if (targetIdx !== current) {
        e.preventDefault();
        onJump(targetIdx);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, total, onJump]);

  // ──────────────────────────────────
  //  touch swipe (mobile)
  // ──────────────────────────────────
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    }

    function onTouchEnd(e: TouchEvent) {
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // horizontal swipe with small vertical movement
      if (Math.abs(dx) > 40 && Math.abs(dy) < 30) {
        const dir = dx < 0 ? 1 : -1;
        const targetIdx = Math.max(0, Math.min(total - 1, current + dir));
        if (targetIdx !== current) onJump(targetIdx);
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [current, total, onJump, prefersReduced]);
}