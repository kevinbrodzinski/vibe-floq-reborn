import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface TimelineScrubberProps {
  /** `scrollProgress` from 0 → 1 (comes from useTimelineProgress) */
  progress: number;
  /** callback receives pct 0 → 1 when knob / track clicked */
  onSeek: (pct: number) => void;
  /** optional coloured dots under the track */
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

  /* watch width */
  useLayoutEffect(() => {
    if (!trackRef.current) return;
    const ro = new ResizeObserver(([e]) => setTrackW(e.contentRect.width));
    ro.observe(trackRef.current);
    setTrackW(trackRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  /* knob motion value */
  const dragX = useMotionValue(progress * trackW);
  /* when scroll updates (not dragging) spring knob */
  useEffect(() => {
    if (prefersReduced) return;
    const controls = animate(dragX, progress * trackW, {
      type: 'spring',
      stiffness: 350,
      damping: 40,
    });
    return () => controls.stop();
  }, [progress, trackW, prefersReduced]);

  /* commit knob position → onSeek */
  const commit = () => {
    const pct = Math.max(0, Math.min(1, dragX.get() / trackW));
    onSeek(pct);
  };

  return (
    <div className="relative mx-auto mt-4 w-full max-w-md select-none">
      {/* track */}
      <div
        ref={trackRef}
        className="h-1 w-full rounded-full bg-muted/40"
        onClick={e => {
          const rect = trackRef.current!.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          onSeek(pct);
          if (!prefersReduced) dragX.set(pct * rect.width);
        }}
      />

      {/* knob */}
      <motion.div
        drag="x"
        dragConstraints={trackRef}
        style={{ x: dragX }}
        dragMomentum={false}
        onDragEnd={commit}
        className="absolute -top-2 h-5 w-5 cursor-pointer rounded-full border-2 border-card bg-primary shadow-lg"
      />

      {/* coloured dots */}
      {moments.length > 1 &&
        moments.map((m, i) => (
          <span
            key={m.title + i}
            className="pointer-events-none absolute top-1/2 h-1 w-1 -translate-y-1/2 rounded-full"
            style={{
              left: `${(i / (moments.length - 1)) * 100}%`,
              background: m.color,
            }}
          />
        ))}
    </div>
  );
}