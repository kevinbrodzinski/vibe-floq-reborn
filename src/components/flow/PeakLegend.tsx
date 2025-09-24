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
  onJump,
}: {
  peaks: PeakLegendItem[];
  max?: number;
  className?: string;
  onHover?: (idx: number|null) => void;
  onJump?: (idx: number) => void;
}) {
  if (!peaks?.length) return null;
  
  const items = [...peaks]
    .sort((a, b) => (b.energy - a.energy) || (
      (new Date(a.t).getTime()) - (new Date(b.t).getTime())
    ))
    .slice(0, max);

  const keyOf = (p: PeakLegendItem, i: number) =>
    `${typeof p.t === 'number' ? p.t : new Date(p.t).getTime()}-${Math.round(p.energy * 100)}-${i}`;

  return (
    <div role="list" className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((p, i) => (
        <button
          key={keyOf(p, i)}
          role="listitem"
          type="button"
          onMouseEnter={() => onHover?.(i)}
          onMouseLeave={() => onHover?.(null)}
          onFocus={() => onHover?.(i)}
          onBlur={() => onHover?.(null)}
          onClick={() => onJump?.(i)}
          className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 bg-white/10 hover:bg-white/15 text-xs text-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={`Peak at ${fmtTime(p.t)} with ${Math.floor(p.energy * 100)}% energy`}
        >
          <span
            aria-hidden
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: energyColor(p.energy) }}
          />
          {fmtTime(p.t)}
        </button>
      ))}
    </div>
  );
}