import * as React from "react";

/**
 * Lightweight orbiting dots. Pure CSS transforms (GPU-friendly) with token colors.
 * Degrades gracefully under prefers-reduced-motion (no animation).
 */
export function MemberParticles({
  live = true,
  rings = 2,                  // number of orbit rings
  dotsPerRing = 2,            // small count keeps it classy
  size = 36,                  // px square
  className = "",
}: { live?: boolean; rings?: number; dotsPerRing?: number; size?: number; className?: string }) {
  const ringColor = live ? "var(--floq-gauge-live-1)" : "var(--floq-gauge-soon-1)";
  const edgeColor = live ? "var(--floq-gauge-live-2)" : "var(--floq-gauge-soon-2)";
  const items: JSX.Element[] = [];

  for (let r = 0; r < rings; r++) {
    const radius = 10 + r * 7;           // inner → outer
    const speed = r === 0 ? "fast" : r === 1 ? "" : "slow";
    items.push(
      <div key={`ring-${r}`} className={`absolute inset-0 floq-orbit ${speed}`} aria-hidden>
        {Array.from({ length: dotsPerRing }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-1.5 w-1.5 rounded-full shadow"
            style={{
              left: `calc(50% - ${radius}px)`,
              top: "50%",
              transform: `translate(-50%, -50%) rotate(${(360 / dotsPerRing) * i}deg) translateX(${radius}px)`,
              backgroundColor: `hsl(${ringColor})`,
              boxShadow: `0 0 10px hsl(${edgeColor} / .6)`
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {items}
    </div>
  );
}