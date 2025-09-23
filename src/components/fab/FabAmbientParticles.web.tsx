import React from 'react';

type Props = {
  enabled?: boolean;     // pause when false
  color?: string;        // vibe hex (brand)
  count?: number;        // default 6
  width?: number;        // default 100
  height?: number;       // default 100
};

export function FabAmbientParticles({
  enabled = true,
  color,
  count = 6,
  width = 100,
  height = 100,
}: Props) {
  const prefersReduced =
    typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!enabled || prefersReduced) return null;

  return (
    <div
      className="pointer-events-none fixed z-[59]"
      style={{ bottom: 80, right: 8, width, height }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="absolute block h-[2px] w-[2px] rounded-full opacity-0 will-change-transform"
          style={{
            left: 35 + i * (width / (count + 1) / 1.3),
            background: color ?? 'hsl(var(--primary))',
            boxShadow: '0 0 4px rgba(102,126,234,0.7)',
            animation: `floatUp 4s linear ${i * 0.4}s infinite`,
          }}
        />
      ))}
    </div>
  );
}