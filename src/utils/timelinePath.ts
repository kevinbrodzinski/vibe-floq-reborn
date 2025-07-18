/**
 * Build a smooth SVG path that wiggles vertically down the screen.
 * Amplitude is driven by moment.vibe_intensity (0-1).
 */
export interface TimelineControlPoint {
  x: number;
  y: number;
}

export function buildTimelinePath(
  moments: { vibe_intensity?: number }[],
  width = 48,
  heightUnit = 80
): string {
  const kAmplitude = width * 0.55; // Scale amplitude with width
  const cps: TimelineControlPoint[] = moments.map((m, i) => {
    const y = i * heightUnit;
    const intensity = (m.vibe_intensity ?? 0.5);
    const amp = Math.min(kAmplitude * intensity, width / 2 - 4); // Clamp to prevent overflow
    const dir = i % 2 === 0 ? 1 : -1;
    return { x: width / 2 + amp * dir, y };
  });

  if (cps.length === 0) return '';

  // ── Move to first point
  let d = `M ${cps[0].x} ${cps[0].y}`;

  // ── Cubic-curve through every other point with rounded precision
  for (let i = 1; i < cps.length; i++) {
    const p = cps[i - 1];
    const c = cps[i];

    const cp1x = +(p.x + (c.x - p.x) * 0.3).toFixed(1);
    const cp1y = +(p.y + (c.y - p.y) * 0.3).toFixed(1);
    const cp2x = +(c.x - (c.x - p.x) * 0.3).toFixed(1);
    const cp2y = +(c.y - (c.y - p.y) * 0.3).toFixed(1);

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${+c.x.toFixed(1)} ${+c.y.toFixed(1)}`;
  }
  return d;
}