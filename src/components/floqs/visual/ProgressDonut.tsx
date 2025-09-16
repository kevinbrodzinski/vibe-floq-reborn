import * as React from "react";

export function ProgressDonut({
  value,      // 0..1
  size = 64,
  stroke = 6,
  live = true // choose token pair
}: { value: number; size?: number; stroke?: number; live?: boolean }) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(C, C * value));

  const g1 = live ? "var(--floq-gauge-live-1)" : "var(--floq-gauge-soon-1)";
  const g2 = live ? "var(--floq-gauge-live-2)" : "var(--floq-gauge-soon-2)";

  const id = React.useId(); // gradient id

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-label="progress">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`hsl(${getHsl(g1)})`} />
          <stop offset="1" stopColor={`hsl(${getHsl(g2)})`} />
        </linearGradient>
      </defs>

      {/* track */}
      <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={stroke} fill="none" />
      {/* arc */}
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={`url(#${id})`} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
    </svg>
  );
}

function getHsl(varName: string) {
  // expects "var(--...)" where we pass the var directly (already hsl triple)
  // strip "var(" and ")"
  return varName.startsWith("var(") ? `var(${varName.slice(4,-1)})` : varName;
}