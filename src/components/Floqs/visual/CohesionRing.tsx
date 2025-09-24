import * as React from "react";

export function CohesionRing({
  cohesion, // 0..1 (higher = more stable)
  colorVar = "--floq-live",
}: { cohesion: number; colorVar?: string }) {
  const thick = 2 + Math.round(4 * cohesion);         // 2..6 px
  const alpha = 0.25 + 0.55 * cohesion;                // 0.25..0.8
  return (
    <div
      aria-hidden
      className="absolute inset-0 rounded-lg"
      style={{
        boxShadow: `0 0 0 ${thick}px hsl(var(${colorVar}) / ${alpha}) inset`,
      }}
    />
  );
}