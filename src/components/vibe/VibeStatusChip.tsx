import * as React from 'react';
import clsx from 'clsx';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { useVibeSnapshots } from '@/hooks/useVibeSnapshots';
import { getRecentReadings } from '@/storage/vibeSnapshots';
import { computeTrend } from './trend';
import { vibeToHex } from '@/lib/vibe/color';
import { safeVibe, VIBES, type Vibe } from '@/lib/vibes';
import { getVibeEmoji, getVibeLabel } from '@/lib/vibeConstants';

type Props = {
  className?: string;
  limit?: number;      // sparkline length
  compact?: boolean;   // fewer labels for tiny HUDs
};

export const VibeStatusChip: React.FC<Props> = ({ className = '', limit = 20, compact = false }) => {
  const eng = useVibeEngine();
  const { data } = useVibeSnapshots(limit);

  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [recent, setRecent] = React.useState(data);

  React.useEffect(() => { setRecent(data); }, [data]);

  const vibe = safeVibe(eng?.currentVibe ?? 'chill');
  const confidence = Math.max(0, Math.min(1, eng?.confidence ?? 0.5));
  const color = vibeToHex(vibe);
  const learning = confidence < 0.5;
  const percent = Math.floor(confidence * 100);

  // build sparkline from confidences (clamped)
  const values = React.useMemo(() => {
    if (!recent?.length) return [];
    const arr = recent.slice(-limit);
    return arr.map(r => Math.max(0, Math.min(1, r.confidence01 ?? 0)));
  }, [recent, limit]);

  const trend = React.useMemo(() => computeTrend(values), [values]);

  // sparkline path
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

  // confidence → saturation (mirrors engine's --vibe-alpha)
  const sat = 0.65 + 0.35 * confidence;
  const styleVars: React.CSSProperties = {
    '--chip-stroke': color,
    '--chip-fill': color + '20',  // css hex + alpha nibble
    '--chip-sat': String(sat),
  } as React.CSSProperties;

  // a11y: Esc to close; focus the panel when open
  React.useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey, { passive: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  React.useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);

  const Arrow: React.FC = () => {
    if (values.length < 7 || confidence < 0.4) return null;
    const cls =
      trend === 'rising' ? 'text-emerald-400' :
      trend === 'easing' ? 'text-amber-400' : 'text-white/60';
    const glyph = trend === 'rising' ? '▲' : trend === 'easing' ? '▼' : '▬';
    return <span className={cls} aria-label={`trend ${trend}`} title={`trend ${trend}`}>{glyph}</span>;
  };

  const onOpen = React.useCallback(async () => {
    setOpen(true);
    try { setRecent(await getRecentReadings(100)); } catch {}
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
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
        <span aria-hidden="true">{getVibeEmoji(vibe)}</span>
        {!compact && <span>{getVibeLabel(vibe)}</span>}
        <Arrow />
        <span className="opacity-70">{percent}%</span>

        {learning && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px]">
            learning
          </span>
        )}

        {/* sparkline */}
        <svg className="ml-2" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {path && <path d={path} fill="none" stroke="var(--chip-fill)" strokeWidth="4" />}
          {path && <path d={path} fill="none" stroke="var(--chip-stroke)" strokeWidth="1.5" />}
        </svg>
      </button>

      {/* Drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vibe-history-title"
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
              <div className="flex items-center gap-2">
                <span className="text-lg">{getVibeEmoji(vibe)}</span>
                <h2 id="vibe-history-title" className="text-sm font-semibold text-white">Vibe History</h2>
              </div>
              <button
                type="button"
                className="text-white/70 hover:text-white"
                aria-label="Close history"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Quick correction grid */}
            <div className="px-4 py-3 border-b border-white/5">
              <div className="text-xs text-white/60 mb-2">Not quite right? Correct now:</div>
              <div className="grid grid-cols-3 gap-1">
                {VIBES.slice(0, 12).map(v => (
                  <button
                    key={v}
                    className={clsx(
                      'px-2 py-1 rounded text-[11px] border flex items-center gap-1',
                      'border-white/10 bg-white/5 hover:bg-white/10 transition-colors',
                      v === vibe && 'bg-white/15 border-white/20'
                    )}
                    onClick={() => {
                      const correctedVibe = safeVibe(v);
                      // Immediate UI override for responsiveness
                      eng?.setVibeOverride?.(correctedVibe);
                      // Feed learning system (if available)
                      eng?.recordCorrection?.(correctedVibe);
                      try { 
                        (window as any).__analytics?.track?.('vibe_corrected', { 
                          from: vibe, 
                          to: correctedVibe,
                          confidence: confidence 
                        }); 
                      } catch {}
                      setOpen(false);
                    }}
                    aria-label={`Correct vibe to ${getVibeLabel(v)}`}
                    title={`Set vibe to ${getVibeLabel(v)}`}
                  >
                    <span>{getVibeEmoji(v)}</span>
                    <span className="text-white/80">{getVibeLabel(v)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 max-h-[50vh] overflow-auto divide-y divide-white/5">
              {recent.length === 0 && (
                <div className="py-6 text-sm text-white/60 text-center">No vibe snapshots yet.</div>
              )}
              {recent.slice().reverse().map((r) => {
                const v = safeVibe(r.vibe as Vibe);
                return (
                  <div key={r.timestamp} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true">{getVibeEmoji(v)}</span>
                      <span className="text-sm text-white/90">{getVibeLabel(v)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/70">
                      <span>{Math.floor((r.confidence01 ?? 0) * 100)}%</span>
                      <time dateTime={new Date(r.timestamp).toISOString()}>
                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};