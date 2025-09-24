import React from 'react';

type Props = {
  enabled?: boolean;  // pause when false
  color?: string;     // vibe hex
  radius?: number;    // default 35
  count?: number;     // default 3
  size?: number;      // default 3 px
  durationMs?: number;// default 6000
};

export function FabOrbitParticles({
  enabled = true,
  color,
  radius = 35,
  count = 3,
  size = 3,
  durationMs = 6000,
}: Props) {
  const prefersReduced =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!enabled || prefersReduced) return null;

  const delays = Array.from({ length: count }).map((_, i) => -(i * (durationMs / count)) / 1000); // s

  return (
    <div
      className="pointer-events-none fixed z-[59]"
      style={{ bottom: 98, right: 26, width: 48, height: 48 }}
    >
      {delays.map((d, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 block will-change-transform"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            background: color ?? 'rgba(102,126,234,0.6)',
            boxShadow: '0 0 6px rgba(102,126,234,0.8)',
            animation: `orbit ${durationMs}ms linear ${d}s infinite`,
          }}
        />
      ))}
    </div>
  );
}