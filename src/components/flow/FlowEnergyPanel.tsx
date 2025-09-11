import * as React from 'react';
import { VibeArcChart } from '@/components/flow/VibeArcChart';
import { PeakLegend } from '@/components/flow/PeakLegend';
import { analyzeVibeJourney, markersFromVibe } from '@/lib/flow/markersFromVibe';

type LatLng = { lat: number; lng: number };
type Sample = { t: number | Date | string; energy: number };

function useContainerWidth() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [w, setW] = React.useState(0);
  
  React.useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setW(ref.current!.clientWidth));
    ro.observe(ref.current);
    setW(ref.current.clientWidth);
    return () => ro.disconnect();
  }, []);
  
  return { ref, width: w };
}

const toMs = (v: number | Date | string) =>
  typeof v === 'number' ? v : (v instanceof Date ? v.getTime() : Date.parse(v));

export function FlowEnergyPanel({
  samples,
  segments,
  height = 160,
  color = '#fff',
  minLabelGapPx = 32,
  maxLegend = 4,
  className = '',
}: {
  samples: Sample[];
  segments?: Array<{ t: number | Date | string; center: LatLng }>;
  height?: number;
  color?: string;
  minLabelGapPx?: number;
  maxLegend?: number;
  className?: string;
}) {
  const { ref, width } = useContainerWidth();
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  if (!samples?.length) {
    return <div className={className}><div className="text-muted-foreground text-sm">No energy samples.</div></div>;
  }

  // ❶ Build a sorted time→center timeline once
  const timeline = React.useMemo(() => {
    if (!segments?.length) return [] as Array<{ t: number; center: LatLng }>;
    return segments
      .map(s => ({ t: toMs(s.t), center: s.center }))
      .filter(s => Number.isFinite(s.t) && s.center)
      .sort((a, b) => a.t - b.t);
  }, [segments]);

  // ❷ Helper to find nearest center for arbitrary t
  const timeToCoord = React.useCallback((tMs: number): LatLng | null => {
    const m = timeline;
    if (!m.length) return null;
    if (tMs <= m[0].t) return m[0].center;
    if (tMs >= m[m.length - 1].t) return m[m.length - 1].center;
    let lo = 0, hi = m.length - 1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      (m[mid].t < tMs) ? (lo = mid) : (hi = mid);
    }
    return (tMs - m[lo].t) <= (m[hi].t - tMs) ? m[lo].center : m[hi].center;
  }, [timeline]);

  // ❸ Analyze + markers
  const analysis = React.useMemo(() => analyzeVibeJourney(samples), [samples]);
  const markers = React.useMemo(() => markersFromVibe(analysis, []), [analysis]);

  // ❹ Hover highlight
  const highlightT = React.useMemo(() => {
    const p = hoverIdx != null ? analysis.arc.peaks?.[hoverIdx] : null;
    return p ? toMs(p.t) : null;
  }, [hoverIdx, analysis]);

  // ❺ Debounce repeated peak jumps
  const lastClick = React.useRef<{ i: number | null; t: number }>({ i: null, t: 0 });
  const handleJump = React.useCallback((peakIdx: number) => {
    const now = Date.now();
    if (lastClick.current.i === peakIdx && (now - lastClick.current.t) < 300) return;
    lastClick.current = { i: peakIdx, t: now };

    const p = analysis.arc.peaks?.[peakIdx];
    if (!p) return;
    const tMs = toMs(p.t);
    const c = timeToCoord(tMs);
    if (!c) return;

    const e = Math.max(0, Math.min(1, p.energy ?? 0.5));
    const prob = Math.max(0.25, Math.min(0.95, 0.25 + 0.7 * e));
    const etaMin = Math.max(3, 15 - Math.round(e * 10));
    const groupMin = 3;

    window.dispatchEvent(new CustomEvent('floq:open-convergence', {
      detail: { lng: c.lng, lat: c.lat, prob, etaMin, groupMin, tMs, source: 'reflection-peak' }
    }));
  }, [analysis, timeToCoord]);

  // ❶ Wider label gaps on narrow screens
  const effectiveGap = width && width < 480 ? Math.max(48, minLabelGapPx) : minLabelGapPx;

  return (
    <div ref={ref} className={className}>
      {width > 0 && (
        <VibeArcChart
          data={samples as any}
          width={width}
          height={height}
          color={color}
          markers={markers}
          minLabelGapPx={effectiveGap}
          showMarkerLabels
          highlightT={highlightT ?? null}
        />
      )}
      {!!analysis.arc.peaks?.length && (
        <PeakLegend
          peaks={analysis.arc.peaks.map(p => ({ t: p.t, energy: p.energy })).slice(0, maxLegend)}
          onHover={setHoverIdx}
          onJump={handleJump}
          className="mt-2 flex flex-wrap gap-2"
        />
      )}
    </div>
  );
}