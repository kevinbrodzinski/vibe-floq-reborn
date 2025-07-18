import { motion, useDragControls } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';
import clsx from 'clsx';

interface Props {
  count: number;                    // total moments
  current: number;                  // current index
  onJump(index: number): void;      // handler from parent
  /** Optional: moments data for enhanced accessibility */
  moments?: { title: string; color: string }[];
}

/**
 * A thin vertical bar that sits left-aligned to the timeline.
 * Drag-or-click to jump; keyboard focusable for a11y.
 * Enhanced with roving tabindex and screen reader support.
 */
export default function TimelineScrubber({ count, current, onJump, moments }: Props) {
  const controls = useDragControls();
  const navRef = useRef<HTMLDivElement>(null);
  const pct = (current / Math.max(1, count - 1)) * 100;

  /* Enable Arrow-key roving focus inside the bar if moments provided */
  useRovingTabIndex('#tl-scrubber', moments?.length);

  /* Capture Enter / Space on the focused dot */
  useEffect(() => {
    if (typeof window === 'undefined') return; // SSR guard
    
    const el = navRef.current;
    if (!el) return;

    const handleKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (key !== 'Enter' && key !== ' ') return;

      const idx = Number((e.target as HTMLElement).dataset.idx);
      if (!Number.isFinite(idx)) return;

      e.preventDefault();
      onJump(idx);
    };

    el.addEventListener('keydown', handleKey);
    return () => el.removeEventListener('keydown', handleKey);
  }, [onJump]);

  // Enhanced mode with individual moment navigation
  if (moments && moments.length > 0) {
    return (
      <nav
        id="tl-scrubber"
        ref={navRef}
        className="flex gap-2 overflow-x-auto py-2 px-2"
        aria-label="Timeline scrubber"
      >
        {moments.map((m, idx) => (
          <button
            key={idx}
            type="button"
            role="button"
            data-idx={idx}
            data-roving="true"
            /* visual state */
            className={`h-2 rounded-full transition-all duration-200 ease-out
                        ${idx === current ? 'w-10 bg-primary' : 'w-4 bg-muted'}`}
            style={{ backgroundColor: idx === current ? m.color : undefined }}
            /* semantics */
            aria-label={`Jump to moment: ${m.title}`}
            aria-current={idx === current ? 'step' : undefined}
            /* pointer */
            onClick={() => onJump(idx)}
          />
        ))}
      </nav>
    );
  }

  // Original draggable scrubber mode
  return (
    <div className="fixed left-3 top-1/2 -translate-y-1/2 z-30 select-none">
      {/* Track */}
      <div
        className="w-1 bg-border rounded-full relative"
        style={{ height: '60vh' }}
      >
        {/* Thumb */}
        <motion.button
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragControls={controls}
          dragElastic={0}
          role="slider"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={count - 1}
          onDrag={(e, info) => {
            const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect();
            const relY = info.point.y - rect.top;
            const idx = Math.round((relY / rect.height) * (count - 1));
            onJump(idx);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp')   onJump(Math.max(0, current - 1));
            if (e.key === 'ArrowDown') onJump(Math.min(count - 1, current + 1));
            if (e.key === 'Home')      onJump(0);
            if (e.key === 'End')       onJump(count - 1);
          }}
          onClick={(e) => {
            const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const idx = Math.round((relY / rect.height) * (count - 1));
            onJump(idx);
          }}
          aria-label={`Timeline scrubber: moment ${current + 1} of ${count}`}
          style={{ top: `calc(${pct}% - 10px)` }}
          className={clsx(
            'absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full',
            'ring-2 ring-primary/60 bg-primary shadow-md focus:outline-none',
            'cursor-pointer focus:ring-4 focus:ring-primary/30'
          )}
        />
      </div>
    </div>
  );
}