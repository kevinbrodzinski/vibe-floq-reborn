import * as React from "react";

export function TTLArc({
  startsAt, endsAt, colorVar = "--floq-live",
}: { startsAt: string; endsAt: string; colorVar?: string }) {
  const pct = React.useMemo(() => {
    const s = +new Date(startsAt);
    const e = +new Date(endsAt);
    const now = Date.now();
    const span = Math.max(1, e - s);
    return Math.max(0, Math.min(1, (e - now) / span)); // 1→0 as time elapses
  }, [startsAt, endsAt]);

  // circle math
  const size = 64; // px
  const r = 30;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(C, C * pct));

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="pointer-events-none absolute right-2 top-2"
      aria-hidden
    >
      {/* background track */}
      <circle cx="32" cy="32" r={r} stroke="hsl(var(--muted-foreground))" strokeOpacity="0.25" strokeWidth="4" fill="none" />
      {/* foreground arc */}
      <circle
        cx="32" cy="32" r={r} fill="none" stroke={`hsl(var(${colorVar}))`} strokeWidth="4"
        strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}