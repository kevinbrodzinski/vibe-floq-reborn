import { useEffect } from 'react';

/**
 * Implements "roving tabindex" inside a container so only one
 * item is tabbable at a time.  Arrow ← / → switch focus.
 */
export function useRovingTabIndex(containerSelector: string, itemCount?: number) {
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    
    const container = document.querySelector<HTMLElement>(containerSelector);
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-roving="true"]')
    );

    if (items.length === 0) return;

    /* make the first item tabbable by default */
    items.forEach((el, i) => (el.tabIndex = i === 0 ? 0 : -1));
    let idx = 0;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();

      items[idx].tabIndex = -1;                // remove previous
      idx = (idx + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      items[idx].tabIndex = 0;
      items[idx].focus();
    };

    container.addEventListener('keydown', handleKey);
    return () => container.removeEventListener('keydown', handleKey);
  }, [containerSelector, itemCount]);
}