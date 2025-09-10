import * as React from 'react';
import { VibeArcChart } from '@/components/flow/VibeArcChart';
import { PeakLegend } from '@/components/flow/PeakLegend';
import { analyzeVibeJourney, markersFromVibe } from '@/lib/flow/markersFromVibe';
import type { EnergySample } from '@/lib/share/generatePostcardClient';

type Sample = { t: number|Date|string; energy: number };

function useContainerWidth<T extends HTMLElement>() {
  const ref = React.useRef<T|null>(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => setW(ref.current!.clientWidth));
    ro.observe(ref.current);
    setW(ref.current.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width: w };
}

// Convert Sample to EnergySample for analysis
function toEnergySample(s: Sample): EnergySample {
  return {
    t: typeof s.t === 'string' ? new Date(s.t) : s.t,
    energy: s.energy
  };
}

export function FlowEnergyPanel({
  samples,
  height = 160,
  color = '#fff',
  minLabelGapPx = 32,
  maxLegend = 4,
  className = '',
}: {
  samples: Sample[];
  height?: number;
  color?: string;
  minLabelGapPx?: number;
  maxLegend?: number;
  className?: string;
}) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoverIdx, setHoverIdx] = React.useState<number|null>(null);

  if (!samples?.length) {
    return <div className={className}><div className="text-white/70 text-sm">No energy samples.</div></div>;
  }

  // Convert to EnergySample format for analysis
  const energySamples = samples.map(toEnergySample);
  const analysis = analyzeVibeJourney(samples);
  const markers = markersFromVibe(analysis, energySamples);

  // Map hovered legend item → timestamp for highlight
  const highlightT = React.useMemo(() => {
    const p = hoverIdx != null ? analysis.arc.peaks?.[hoverIdx] : null;
    return p ? (typeof p.t === 'number' ? p.t : (p.t instanceof Date ? p.t.getTime() : Date.parse(p.t))) : null;
  }, [hoverIdx, analysis]);

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
          peaks={analysis.arc.peaks}
          max={maxLegend}
          onHover={setHoverIdx}
          className="mt-0.5"
        />
      )}
    </div>
  );
}