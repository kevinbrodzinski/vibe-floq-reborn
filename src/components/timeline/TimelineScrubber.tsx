import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  MotionValue,
} from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface TimelineScrubberProps {
  /** current scroll progress 0‒1 (from useScroll) */
  progress: MotionValue<number>;
  /** jump handler supplied by useTimelineNavigation */
  onSeek: (pct: number) => void;
  /** colors (used for gradient dots) – optional */
  moments?: { title: string; color: string }[];
}

export function TimelineScrubber({
  progress,
  onSeek,
  moments = [],
}: TimelineScrubberProps) {
  const prefersReduced = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);

  // ResizeObserver ⇒ keep track width fresh
  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const ro = new ResizeObserver(([entry]) =>
      setTrackW(entry.contentRect.width),
    );
    ro.observe(trackRef.current);
    setTrackW(trackRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // knob x-motion linked to scroll progress
  const x = useTransform(progress, (v) => v * trackW);

  // click / drag handling
  const dragX = useMotionValue(0);
  function commitDrag() {
    const pct = dragX.get() / trackW;
    onSeek(Math.max(0, Math.min(1, pct)));
  }

  // spring knob when user scrolls (only if not dragging)
  useEffect(() => {
    const controls = animate(dragX, x, { type: 'spring', stiffness: 300 });
    return () => controls.stop();
  }, [x, dragX]);

  return (
    <div
      ref={trackRef}
      className="relative mx-auto mt-4 h-2 w-11/12 rounded-full bg-muted"
      aria-label="Timeline scrubber"
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress.get() * 100)}
    >
      {/* knob */}
      <motion.div
        drag="x"
        dragConstraints={trackRef}
        style={{ x: dragX }}
        onDragEnd={commitDrag}
        onClick={(e) => {
          const rect = trackRef.current?.getBoundingClientRect();
          if (!rect) return;
          const pct = (e.clientX - rect.left) / rect.width;
          onSeek(pct);
          if (!prefersReduced) dragX.set(pct * rect.width);
        }}
        className="absolute -top-2 h-6 w-6 rounded-full border-2 border-card bg-primary shadow-lg"
      />
      {/* optional dot markers */}
      {moments.length > 1 &&
        moments.map((m, i) => (
          <span
            key={i}
            style={{ left: `${(i / (moments.length - 1)) * 100}%` }}
            className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40"
          />
        ))}
    </div>
  );
}