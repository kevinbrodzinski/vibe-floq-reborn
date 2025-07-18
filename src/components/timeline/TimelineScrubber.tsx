import { motion, useDragControls } from 'framer-motion';
import clsx from 'clsx';

interface Props {
  count: number;                    // total moments
  current: number;                  // current index
  onJump(index: number): void;      // handler from parent
}

/**
 * A thin vertical bar that sits left-aligned to the timeline.
 * Drag-or-click to jump; keyboard focusable for a11y.
 */
export default function TimelineScrubber({ count, current, onJump }: Props) {
  const controls = useDragControls();
  const pct = (current / Math.max(1, count - 1)) * 100;

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
          aria-label="Timeline scrubber"
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