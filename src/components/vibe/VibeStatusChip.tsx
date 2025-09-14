import * as React from 'react';
import clsx from 'clsx';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { useVibeSnapshots } from '@/hooks/useVibeSnapshots';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe, type Vibe } from '@/lib/vibes';
import { getVibeEmoji, getVibeLabel } from '@/lib/vibeConstants';

type Props = {
  className?: string;
  limit?: number;           // sparkline length
  compact?: boolean;        // fewer labels for tight spaces
};

export const VibeStatusChip: React.FC<Props> = ({ className, limit = 20, compact = false }) => {
  const eng = useVibeEngine(); // { currentVibe, confidence, isDetecting, productionReading? }
  const { data } = useVibeSnapshots(limit);

  const vibe = safeVibe(eng?.currentVibe ?? 'chill');
  const confidence = Math.max(0, Math.min(1, eng?.confidence ?? 0.5));
  const color = vibeToHex(vibe);

  // Build sparkline coords (confidence history)
  const values = React.useMemo(() => {
    if (!data?.length) return [];
    // normalize array length to `limit`
    const arr = data.slice(-limit);
    const confs = arr.map(r => Math.max(0, Math.min(1, r.confidence01 ?? 0)));
    return confs;
  }, [data, limit]);

  const { path, w, h } = React.useMemo(() => {
    const W = 84, H = 24, P = 2; // width, height, padding
    if (!values.length) return { path: '', w: W, h: H };
    const n = values.length;
    const step = (W - P * 2) / Math.max(1, n - 1);
    const y = (v: number) => P + (1 - v) * (H - P * 2);
    const x = (i: number) => P + i * step;
    let d = `M ${x(0)} ${y(values[0])}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i)} ${y(values[i])}`;
    return { path: d, w: W, h: H };
  }, [values]);

  const percent = Math.floor(confidence * 100);
  const learning = confidence < 0.5;

  // Confidence → saturation (optional; we also set --vibe-alpha via engine)
  const sat = 0.65 + 0.35 * confidence; // 0.65..1.0
  const styleVars: React.CSSProperties = {
    // Use runtime CSS vars, but ensure chip has a readable fallback color:
    // we tint only borders/line/fill; text stays readable
    '--chip-stroke': color,
    '--chip-fill': color + '20', // ~12% alpha
    '--chip-sat': String(sat),
  } as React.CSSProperties;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5',
        'backdrop-blur-md bg-black/40 border-white/10 text-white',
        'shadow-[0_2px_12px_rgba(0,0,0,0.25)]',
        className
      )}
      style={styleVars}
      title={`Vibe: ${getVibeLabel(vibe)} · Confidence: ${percent}%`}
      data-testid="vibe-status-chip"
    >
      {/* Emoji + label */}
      <span className="text-base leading-none" aria-hidden="true">
        {getVibeEmoji(vibe)}
      </span>
      {!compact && (
        <span className="text-xs font-medium">
          {getVibeLabel(vibe)}
        </span>
      )}

      {/* Confidence */}
      <span className={clsx('text-[11px] tabular-nums opacity-80', learning && 'opacity-60')}>
        {percent}%
      </span>

      {/* Learning badge when low confidence */}
      {learning && (
        <span
          className="ml-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/80"
          aria-label="Learning mode"
        >
          learning
        </span>
      )}

      {/* Sparkline */}
      <svg
        width={w} height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="ml-2"
        aria-hidden="true"
        focusable="false"
        style={{ filter: `saturate(var(--chip-sat))` }}
      >
        {/* Fill under line */}
        {!!path && (
          <path
            d={`${path} L ${w - 2} ${h - 2} L 2 ${h - 2} Z`}
            fill="var(--chip-fill)"
            stroke="none"
          />
        )}
        {/* Line */}
        {!!path && (
          <path
            d={path}
            fill="none"
            stroke="var(--chip-stroke)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.95 }}
          />
        )}
        {/* Current dot */}
        {values.length > 0 && (
          <circle
            cx={w - 2}
            cy={2 + (1 - values[values.length - 1]) * (h - 4)}
            r="2.5"
            fill="var(--chip-stroke)"
            stroke="#fff"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
};