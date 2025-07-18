import { motion, useTransform, MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface TLProps {
  moments: { title: string; color: string }[];
  progressVal: MotionValue<number>;  // from parent
  onSeek: (pct: number) => void;
  className?: string;
}

export function TimelineScrubber({
  moments,
  progressVal,
  onSeek,
  className = '',
}: TLProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();
  const knobX = useTransform(progressVal, v => `calc(${v * 100}% - 8px)`);

  /* click / drag helper */
  const handleSeek = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    onSeek(pct);
    if (!prefersReduced) progressVal.set(pct);
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-2 rounded-full bg-muted/50 ${className}`}
      onClick={e => handleSeek(e.clientX)}
    >
      {/* knob */}
      <motion.span
        style={{ translateX: knobX }}
        drag="x"
        dragConstraints={trackRef}
        dragElastic={0}
        onDrag={(_, info) => handleSeek(info.point.x)}
        className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary ring-2 ring-white"
        aria-label="timeline scrubber"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={moments.length - 1}
        aria-valuenow={Math.round(progressVal.get() * (moments.length - 1))}
      />

      {/* coloured tick-marks */}
      {moments.map((m, i) => (
        <span
          key={i}
          className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
          style={{
            left:
              moments.length === 1
                ? '50%'
                : `${(i / (moments.length - 1)) * 100}%`,
            background: m.color,
          }}
          role="button"
          aria-label={`Jump to ${m.title}`}
          onClick={e => {
            e.stopPropagation();
            handleSeek(
              (e.target as HTMLElement).getBoundingClientRect().left,
            );
          }}
        />
      ))}
    </div>
  );
}