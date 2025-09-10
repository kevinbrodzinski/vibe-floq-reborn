import * as React from 'react';

export type PeakLegendItem = { t: number|Date|string; energy: number; label?: string };

const fmtTime = (t: number|Date|string) =>
  new Date(typeof t === 'number' ? t : (t instanceof Date ? t.getTime() : Date.parse(t)))
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const energyColor = (e: number) => {
  // blue (low) → pink (high)
  const h = Math.round(210 + 120 * Math.max(0, Math.min(1, e)));
  return `hsl(${h} 90% 60%)`;
};

export function PeakLegend({
  peaks,
  max = 4,
  className = '',
  onHover,
}: {
  peaks: PeakLegendItem[];
  max?: number;
  className?: string;
  onHover?: (idx: number|null) => void;
}) {
  if (!peaks?.length) return null;
  const items = [...peaks]
    .sort((a, b) => (b.energy - a.energy) || (
      (new Date(a.t).getTime()) - (new Date(b.t).getTime())
    ))
    .slice(0, max);

  return (
    <div className={`flex flex-wrap gap-3 items-center ${className}`}>
      {items.map((p, i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => onHover?.(i)}
          onMouseLeave={() => onHover?.(null)}
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 bg-white/8 hover:bg-white/12 text-xs text-white/90"
          aria-label={`Peak at ${fmtTime(p.t)} with ${(p.energy*100|0)}% energy`}
        >
          <span
            aria-hidden
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: energyColor(p.energy) }}
          />
          <span className="tabular-nums">{fmtTime(p.t)}</span>
        </button>
      ))}
    </div>
  );
}