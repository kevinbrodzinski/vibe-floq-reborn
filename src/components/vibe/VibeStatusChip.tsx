import * as React from 'react';
import clsx from 'clsx';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { useVibeSnapshots } from '@/hooks/useVibeSnapshots';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe, type Vibe } from '@/lib/vibes';
import { getVibeEmoji, getVibeLabel } from '@/lib/vibeConstants';
import { computeTrend } from './trend';
import { getRecentReadings } from '@/storage/vibeSnapshots';

type Props = {
  className?: string;
  limit?: number;      // sparkline length
  compact?: boolean;   // fewer labels for tiny HUDs
};

export const VibeStatusChip: React.FC<Props> = ({ className, limit = 20, compact = false }) => {
  const eng = useVibeEngine();
  const { data } = useVibeSnapshots(limit);
  const [open, setOpen] = React.useState(false);
  const [recent, setRecent] = React.useState(data);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => { setRecent(data); }, [data]);

  const vibe = safeVibe(eng?.currentVibe ?? 'chill');
  const confidence = Math.max(0, Math.min(1, eng?.confidence ?? 0.5));
  const color = vibeToHex(vibe);
  const learning = confidence < 0.5;
  const percent = Math.floor(confidence * 100);

  // build sparkline from confidences
  const values = React.useMemo(() => {
    if (!recent?.length) return [];
    const arr = recent.slice(-limit);
    return arr.map(r => Math.max(0, Math.min(1, r.confidence01 ?? 0)));
  }, [recent, limit]);

  const trend = React.useMemo(() => computeTrend(values), [values]);

  // quick SVG path
  const { path, w, h } = React.useMemo(() => {
    const W = 84, H = 24, P = 2;
    if (!values.length) return { path: '', w: W, h: H };
    const n = values.length;
    const step = n > 1 ? (W - P * 2) / (n - 1) : 0;
    const y = (v: number) => P + (1 - v) * (H - P * 2);
    const x = (i: number) => P + i * step;
    let d = `M ${x(0)} ${y(values[0])}`;
    for (let i = 1; i < n; i++) d += ` L ${x(i)} ${y(values[i])}`;
    return { path: d, w: W, h: H };
  }, [values]);

  // optional local saturation to mirror confidence
  const sat = 0.65 + 0.35 * confidence;
  const styleVars: React.CSSProperties = {
    '--chip-stroke': color,
    '--chip-fill': color + '20',
    '--chip-sat': String(sat),
  } as React.CSSProperties;

  const Arrow = () => {
    if (values.length < 5 || confidence < 0.4) return null;
    const cls =
      trend === 'rising' ? 'text-emerald-400' :
      trend === 'easing' ? 'text-amber-400' : 'text-white/60';
    const glyph = trend === 'rising' ? '▲' : trend === 'easing' ? '▼' : '▬';
    return <span className={cls + ' text-[10px] ml-1'} aria-label={`trend ${trend}`}>{glyph}</span>;
  };

  // a11y: Esc to close, focus drawer on open
  React.useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey, { passive: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  React.useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          setOpen(true);
          // lazy refresh when user opens
          try { 
            setRecent(await getRecentReadings(100)); 
          } catch {}
        }}
        aria-label="Open vibe history"
        aria-controls="vibe-history"
        className={clsx(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5',
          'backdrop-blur-md bg-black/40 border-white/10 text-white',
          'shadow-[0_2px_12px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-white/20',
          'hover:bg-black/50 transition-colors',
          className
        )}
        style={styleVars}
        title={`Vibe: ${getVibeLabel(vibe)} · Confidence: ${percent}% · Click for history`}
        data-testid="vibe-status-chip"
      >
        <span className="text-base leading-none" aria-hidden="true">
          {getVibeEmoji(vibe)}
        </span>

        {!compact && (
          <span className="text-xs font-medium">{getVibeLabel(vibe)}</span>
        )}

        <span className={clsx('text-[11px] tabular-nums opacity-80', learning && 'opacity-60')}>
          {percent}%
        </span>

        <Arrow />

        {learning && (
          <span
            className="ml-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-white/80"
            aria-label="Learning mode"
          >
            learning
          </span>
        )}

        <svg
          width={w} height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="ml-2"
          aria-hidden="true"
          focusable="false"
          style={{ filter: `saturate(var(--chip-sat))` }}
        >
          {!!path && (
            <path
              d={`${path} L ${w - 2} ${h - 2} L 2 ${h - 2} Z`}
              fill="var(--chip-fill)"
              stroke="none"
            />
          )}
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
      </button>

      {/* History Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          id="vibe-history"
          className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            ref={panelRef}
            tabIndex={-1}
            className="relative w-full sm:max-w-md max-h-[80vh] bg-[#0B0F1A] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-sm font-semibold text-white">Vibe History</div>
              <button
                className="text-white/70 hover:text-white text-sm p-1"
                onClick={() => setOpen(false)}
                aria-label="Close history"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto max-h-[60vh]">
              {recent.length === 0 && (
                <div className="text-xs text-white/60 text-center py-8">
                  No vibe snapshots yet.
                </div>
              )}
              {recent.slice().reverse().map((r) => (
                <div 
                  key={r.timestamp}
                  className="flex items-center justify-between text-[11px] text-white/80 py-1"
                >
                  <div className="flex items-center gap-2">
                    <span>{getVibeEmoji(safeVibe(r.vibe as Vibe))}</span>
                    <span className="font-medium">{getVibeLabel(safeVibe(r.vibe as Vibe))}</span>
                  </div>
                  <div className="tabular-nums font-mono">
                    {Math.floor((r.confidence01 ?? 0) * 100)}%
                  </div>
                  <div className="text-white/50 tabular-nums">
                    {new Date(r.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};