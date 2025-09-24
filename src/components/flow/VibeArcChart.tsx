import * as React from 'react';
import { AreaClosed, LinePath } from '@visx/shape';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveMonotoneX } from '@visx/curve';
import { withTooltip, TooltipWithBounds } from '@visx/tooltip';

type Sample = { t: number|Date|string; energy: number };
type Marker = { t: number|Date|string; energy: number; kind: 'peak'|'valley'|'transition'; label?: string };

type Props = {
  data: Sample[];
  width: number;
  height: number;
  color?: string;
  peaks?: number;
  markers?: Marker[];
  minLabelGapPx?: number;
  showMarkerLabels?: boolean;
  highlightT?: number | null;
};

const toMs = (v: number|Date|string) =>
  (typeof v === 'number') ? v : (v instanceof Date ? v.getTime() : Date.parse(v));

const timeToX = (xScale: any, t: number|Date|string) => xScale(new Date(toMs(t)));

const energyColor = (e: number) => {
  const h = Math.round(210 + 120 * Math.max(0, Math.min(1, e)));
  return `hsl(${h} 90% 60%)`;
};

const Inner: React.FC<Props & any> = ({
  data,
  width,
  height,
  color = '#fff',
  peaks = 3,
  markers = [],
  minLabelGapPx = 32,
  showMarkerLabels = true,
  highlightT = null,
  showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop,
}) => {
  if (width <= 10 || height <= 10 || data.length < 2) return null;

  // scales
  const xScale = scaleTime({
    domain: [new Date(toMs(data[0].t)), new Date(toMs(data[data.length - 1].t))],
    range: [0, width],
  });
  const yScale = scaleLinear({ domain: [0, 1], range: [height, 0], nice: true });

  // top peaks for dots
  const topPeaks = [...data].sort((a, b) => b.energy - a.energy).slice(0, Math.min(peaks, data.length));

  // marker layout with overflow guard
  const laidOut = React.useMemo(() => {
    if (!markers?.length) return [];
    const ms = markers.map(m => ({ ...m, x: timeToX(xScale, m.t), y: yScale(m.energy) }))
                      .sort((a, b) => a.x - b.x);
    const out: typeof ms = [];
    let lastLabeledX = -Infinity;
    let flip = false;

    for (const m of ms) {
      const tooClose = Math.abs(m.x - lastLabeledX) < minLabelGapPx;
      const label = showMarkerLabels && !tooClose ? (m.label ?? (m.kind)) : undefined;
      if (label) {
        lastLabeledX = m.x;
      }
      out.push({
        ...m,
        _label: label,
        _dy: label ? (flip ? -10 : 14) : 0,
      });
      flip = !flip;
    }
    return out;
  }, [markers, xScale, yScale, minLabelGapPx, showMarkerLabels]);

  // highlight lookup (nearest sample)
  let hX: number | null = null;
  let hY: number | null = null;
  if (typeof highlightT === 'number') {
    // nearest index to highlight time
    let lo = 0, hi = data.length - 1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      (toMs(data[mid].t) < highlightT) ? (lo = mid) : (hi = mid);
    }
    const pick = (highlightT - toMs(data[lo].t)) <= (toMs(data[hi].t) - highlightT) ? data[lo] : data[hi];
    hX = xScale(new Date(toMs(pick.t)));
    hY = yScale(pick.energy);
  }

  // hover
  const onMove = (clientX: number, node: HTMLElement) => {
    const { left } = node.getBoundingClientRect();
    const x = clientX - left;
    const t = (xScale.invert(x) as Date).getTime();
    // nearest index
    let lo = 0, hi = data.length - 1;
    while (hi - lo > 1) {
      const mid = (hi + lo) >> 1;
      (toMs(data[mid].t) < t) ? (lo = mid) : (hi = mid);
    }
    const d = (t - toMs(data[lo].t)) <= (toMs(data[hi].t) - t) ? data[lo] : data[hi];
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(new Date(toMs(d.t))),
      tooltipTop: yScale(d.energy),
    });
  };

  return (
    <div className="relative">
      <svg width={width} height={height} role="img" aria-label="Energy arc">
        {/* area fill */}
        <AreaClosed
          data={data as any}
          x={(d: Sample) => timeToX(xScale, d.t)}
          y={(d: Sample) => yScale(d.energy)}
          yScale={yScale}
          stroke="none"
          fill="rgba(255,255,255,0.12)"
          curve={curveMonotoneX}
        />
        {/* line */}
        <LinePath
          data={data as any}
          x={(d: Sample) => timeToX(xScale, d.t)}
          y={(d: Sample) => yScale(d.energy)}
          stroke={color}
          strokeWidth={2}
          curve={curveMonotoneX}
        />
        {/* peak dots */}
        {topPeaks.map((p, i) => (
          <circle key={`p-${i}`} cx={timeToX(xScale, p.t)} cy={yScale(p.energy)} r={3} fill={energyColor(p.energy)} />
        ))}
        {/* markers + overflow-guarded labels */}
        {laidOut.map((m, i) => (
          <g key={`m-${i}`} transform={`translate(${m.x},${m.y})`}>
            <circle r={3.5} fill={energyColor(m.energy)} />
            {m._label && (
              <text
                x={6}
                y={m._dy}
                fontSize={11}
                fill="white"
                opacity={0.9}
                stroke="none"
              >
                {m._label}
              </text>
            )}
          </g>
        ))}

        {/* highlight guideline + ring */}
        {hX != null && hY != null && (
          <g aria-hidden>
            <line x1={hX} y1={0} x2={hX} y2={height} stroke="white" strokeOpacity={0.15} strokeDasharray="3 3" />
            <circle cx={hX} cy={hY} r={5.5} fill="none" stroke="white" strokeWidth={2} />
          </g>
        )}

        {/* hit rect for tooltips */}
        <rect
          x={0} y={0} width={width} height={height} fill="transparent"
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget as unknown as HTMLElement)}
          onTouchMove={(e) => onMove((e.changedTouches?.[0]?.clientX ?? 0), e.currentTarget as unknown as HTMLElement)}
          onMouseLeave={hideTooltip}
        />
      </svg>

      {tooltipData && typeof tooltipLeft === 'number' && typeof tooltipTop === 'number' && (
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} className="pointer-events-none text-xs">
          <div className="flex flex-col gap-1">
            <div>{Math.round((tooltipData as Sample).energy * 100)}% energy</div>
            <div>{new Date(toMs((tooltipData as Sample).t)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};

export const VibeArcChart = withTooltip<Props>(Inner);