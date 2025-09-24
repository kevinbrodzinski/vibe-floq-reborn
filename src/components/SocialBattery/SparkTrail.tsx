import React, { useEffect, useRef, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';

type Area = { x: number; y: number; w: number; h: number };

type SparkTrailProps = {
  size?: number;
  accent?: string;
  density?: number;      // number of dots in the trail
  speedMs?: number;      // duration of one cycle
  area?: Area;           // relative area (0..1) inside the battery box to render the trail
};

export default function SparkTrail({
  size = 52,
  accent = 'var(--color-primary)',
  density = 6,
  speedMs = 1200,
  area = { x: 0.55, y: 0.12, w: 0.28, h: 0.30 },
}: SparkTrailProps) {
  const [phase, setPhase] = useState(0);               // 0..1
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    const loop = (t: number) => {
      if (start.current == null) start.current = t;
      const dt = (t - start.current) % speedMs;
      setPhase(dt / speedMs);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [speedMs]);

  const sx = area.x * size, sy = area.y * size;
  const w = area.w * size, h = area.h * size;

  const dots: JSX.Element[] = [];
  const n = Math.max(1, density);
  for (let i = 0; i < n; i++) {
    const offset = (phase + i / n) % 1;          // head → tail 0..1
    const x = sx + (i / Math.max(1, n - 1)) * w; // across area width
    const y = sy + (1 - offset) * h;             // upward drift
    const r = 0.8 + (1 - offset) * 1.4;         // smaller as it rises
    const o = 0.15 + (1 - offset) * 0.4;        // fade as it rises
    dots.push(<Circle key={i} cx={x} cy={y} r={r} fill={accent} opacity={o} />);
  }

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
      {dots}
    </Svg>
  );
}