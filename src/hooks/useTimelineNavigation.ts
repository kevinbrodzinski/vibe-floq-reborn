import { useCallback, useEffect } from 'react';

interface Options {
  /** total number of moments in the current timeline */
  total: number;
  /** zero-based index of the moment that is currently "in view" */
  current: number;
  /** callback that actually scrolls / focuses the requested moment */
  onJump(index: number): void;
}

/**
 * Global timeline-navigation helpers:
 *  • ← / → / ↑ / ↓ / Home / End   (desktop)
 *  • single-finger vertical swipe (mobile)
 *
 *  Usage:
 *    useTimelineNavigation({ total, current, onJump })
 *
 *  The hook is completely passive – it only installs / cleans up listeners.
 */
export function useTimelineNavigation({ total, current, onJump }: Options) {
  /* ------------------------------------------------------------------ *
   * Keyboard shortcuts
   * ------------------------------------------------------------------ */
  const handleKey = useCallback<(e: KeyboardEvent) => void>(
    (e) => {
      // don't hijack when the user is typing in an input / textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          onJump(Math.min(total - 1, current + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          onJump(Math.max(0, current - 1));
          break;
        case 'Home':
          onJump(0);
          break;
        case 'End':
          onJump(total - 1);
          break;
        default:
          break;
      }
    },
    [current, total, onJump]
  );

  /* ------------------------------------------------------------------ *
   * Touch swipe (basic one-finger vertical)
   * ------------------------------------------------------------------ */
  const handleTouchStart = useCallback<(e: TouchEvent) => void>(
    (e) => {
      if (e.touches.length !== 1) return;               // multi-touch → ignore
      const startY = e.touches[0].clientY;

      const handleMove = (m: TouchEvent) => {
        const dy = m.touches[0].clientY - startY;
        if (Math.abs(dy) < 60) return;                  // 60 px threshold

        if (dy > 0) {
          onJump(Math.min(total - 1, current + 1));     // swipe ↓ → next
        } else {
          onJump(Math.max(0, current - 1));             // swipe ↑ → previous
        }
        window.removeEventListener('touchmove', handleMove);
      };

      window.addEventListener('touchmove', handleMove, { passive: true, once: true });
    },
    [current, total, onJump]
  );

  /* ------------------------------------------------------------------ *
   * Install / cleanup listeners
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    
    window.addEventListener('keydown', handleKey);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [handleKey, handleTouchStart]);
}