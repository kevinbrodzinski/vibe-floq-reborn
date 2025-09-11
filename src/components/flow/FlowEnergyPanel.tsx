import * as React from 'react';
import { VibeArcChart } from '@/components/flow/VibeArcChart';
import { PeakLegend } from '@/components/flow/PeakLegend';
import { analyzeVibeJourney, markersFromVibe } from '@/lib/flow/markersFromVibe';

type LatLng = { lat: number; lng: number };
type Sample = { t: number | Date | string; energy: number };

function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T | null>(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setW(ref.current!.clientWidth));
    ro.observe(ref.current!);
    setW(ref.current!.clientWidth);
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
    return <div className={className}><div className="text-white/70 text-sm">No energy samples.</div></div>;
  }

  const analysis = analyzeVibeJourney(samples);
  const markers = markersFromVibe(analysis, []);

  const highlightT = React.useMemo(() => {
    const p = hoverIdx != null ? analysis.arc.peaks?.[hoverIdx] : null;
    return p ? toMs(p.t) : null;
  }, [hoverIdx, analysis]);

  // helper: nearest segment center for a given time
  const timeToCoord = React.useCallback((tMs: number): LatLng | null => {
    if (!segments?.length) return null;
    const m = segments.map(s => ({ t: toMs(s.t), center: s.center })).sort((a,b)=>a.t-b.t);
    if (!m.length) return null;
    if (tMs <= m[0].t) return m[0].center;
    if (tMs >= m[m.length-1].t) return m[m.length-1].center;
    let lo=0, hi=m.length-1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      (m[mid].t < tMs) ? (lo = mid) : (hi = mid);
    }
    return (tMs - m[lo].t) <= (m[hi].t - tMs) ? m[lo].center : m[hi].center;
  }, [segments]);

  // Legend → click to jump
  const handleJump = React.useCallback((peakIdx: number) => {
    const peak = analysis.arc.peaks?.[peakIdx];
    if (!peak) return;
    const tMs = toMs(peak.t);
    const coord = timeToCoord(tMs);
    if (!coord) return;

    // cheap heuristics for prob / eta based on energy
    const e = Math.max(0, Math.min(1, peak.energy ?? 0.5));
    const prob   = Math.max(0.25, Math.min(0.95, 0.25 + 0.7 * e));     // 25%..95%
    const etaMin = Math.max(3, 15 - Math.round(e * 10));                // 3..15 min
    const groupMin = 3;

    window.dispatchEvent(new CustomEvent('floq:open-convergence', {
      detail: { lng: coord.lng, lat: coord.lat, prob, etaMin, groupMin }
    }));
  }, [analysis, timeToCoord]);

  return (
    <div ref={ref} className={`flex flex-col gap-3 ${className}`}>
      {width > 0 && (
        <VibeArcChart
          data={samples}
          width={width}
          height={height}
          color={color}
          markers={markers}
          minLabelGapPx={minLabelGapPx}
          showMarkerLabels
          highlightT={highlightT}
        />
      )}
      {!!(analysis.arc.peaks?.length) && (
        <PeakLegend
          peaks={analysis.arc.peaks.slice(0, maxLegend)}
          onHover={setHoverIdx}
          onJump={handleJump}
        />
      )}
    </div>
  );
}