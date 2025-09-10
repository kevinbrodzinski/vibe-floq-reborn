import * as React from 'react';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AreaClosed, LinePath, Bar, Circle } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { withTooltip, TooltipWithBounds } from '@visx/tooltip';

type Sample = { t: number | Date | string; energy: number };

type Props = {
  data: Sample[];
  width: number;
  height: number;
  color?: string;
  peaks?: number;
  markers?: { t: number | Date | string; energy: number; kind: 'peak'|'valley'|'transition'; label?: string }[];
};

// util
const toMs = (v: number | Date | string) =>
  typeof v === 'number' ? v : v instanceof Date ? v.getTime() : new Date(v).getTime();

function nearestIndex(data: Sample[], tMs: number) {
  if (data.length <= 1) return 0;
  let lo = 0, hi = data.length - 1;
  while (hi - lo > 1) {
    const mid = (hi + lo) >> 1;
    (toMs(data[mid].t) < tMs) ? (lo = mid) : (hi = mid);
  }
  return (tMs - toMs(data[lo].t)) <= (toMs(data[hi].t) - tMs) ? lo : hi;
}

const Inner: React.FC<any> = ({
  data, width, height, color = '#fff', peaks = 3,
  markers = [],
  showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop
}) => {
  if (width <= 10 || height <= 10 || data.length < 2) return null;

  const xScale = scaleTime({
    domain: [new Date(toMs(data[0].t)), new Date(toMs(data[data.length-1].t))],
    range: [0, width],
  });
  const yScale = scaleLinear({ domain: [0, 1], range: [height, 0], nice: true });

  const bigPeaks = [...data].sort((a,b)=>b.energy-a.energy).slice(0, Math.min(peaks, data.length));

  const onMove = (clientX: number, node: HTMLElement) => {
    const { left } = node.getBoundingClientRect();
    const x = clientX - left;
    const xDate = xScale.invert(x);
    const idx = nearestIndex(data, xDate.getTime());
    const d = data[idx];
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(new Date(toMs(d.t))),
      tooltipTop: yScale(d.energy),
    });
  };

  return (
    <div style={{ position:'relative' }}>
      <svg width={width} height={height}>
        <AreaClosed<Sample>
          data={data}
          x={d => xScale(new Date(toMs(d.t)))}
          y={d => yScale(d.energy)}
          yScale={yScale}
          stroke="none"
          fill="rgba(255,255,255,0.12)"
          curve={curveMonotoneX}
        />
        <LinePath<Sample>
          data={data}
          x={d => xScale(new Date(toMs(d.t)))}
          y={d => yScale(d.energy)}
          stroke={color}
          strokeWidth={2}
          curve={curveMonotoneX}
        />
        {bigPeaks.map((p, i) => (
          <Circle key={i} cx={xScale(new Date(toMs(p.t)))} cy={yScale(p.energy)} r={3.5} fill="#fff" />
        ))}
        {markers.map((m, i) => (
          <Circle
            key={`m-${i}`}
            cx={xScale(new Date(toMs(m.t)))}
            cy={yScale(m.energy)}
            r={m.kind === 'transition' ? 3 : 4}
            fill={m.kind === 'peak' ? '#fff' : m.kind === 'valley' ? '#7dd3fc' : '#f97316'}
          />
        ))}
        <Bar
          x={0} y={0} width={width} height={height} fill="transparent"
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget as unknown as HTMLElement)}
          onTouchMove={(e) => onMove((e.changedTouches?.[0]?.clientX ?? 0), e.currentTarget as unknown as HTMLElement)}
          onMouseLeave={hideTooltip}
        />
      </svg>

      {tooltipData && (
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={{ color: '#111', background:'white' }}>
          {Math.round((tooltipData as Sample).energy * 100)}% • {new Date(toMs((tooltipData as Sample).t)).toLocaleTimeString()}
        </TooltipWithBounds>
      )}
    </div>
  );
};

export const VibeArcChart = withTooltip(Inner as any);