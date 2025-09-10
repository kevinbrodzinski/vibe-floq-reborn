import React from 'react';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AreaClosed, LinePath, Bar, Circle } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { withTooltip, Tooltip, defaultStyles } from '@visx/tooltip';

export type Sample = { t: number | Date; energy: number };

type Props = {
  data: Sample[];
  width: number;
  height: number;
  color?: string;
  peaks?: number; // how many peak dots to label
};

function toMs(t: number | Date) { return t instanceof Date ? t.getTime() : t; }

function nearestIndex(data: Sample[], tMs: number) {
  if (data.length <= 1) return 0;
  let lo = 0, hi = data.length - 1;
  while (hi - lo > 1) {
    const mid = (hi + lo) >> 1;
    (toMs(data[mid].t) < tMs) ? (lo = mid) : (hi = mid);
  }
  return (tMs - toMs(data[lo].t)) <= (toMs(data[hi].t) - tMs) ? lo : hi;
}

const Inner = ({
  data, width, height, color = '#fff', peaks = 3,
  showTooltip, hideTooltip, tooltipData, tooltipLeft, tooltipTop
}) => {
  if (width <= 10 || height <= 10 || data.length < 2) return null;

  const xMin = 0, xMax = width, yMin = 0, yMax = height;
  const domainX: [Date, Date] = [
    new Date(toMs(data[0].t)),
    new Date(toMs(data[data.length - 1].t))
  ];
  const domainY: [number, number] = [0, 1];

  const xScale = scaleTime({ domain: domainX, range: [xMin, xMax] });
  const yScale = scaleLinear({ domain: domainY, range: [yMax, yMin], nice: true });

  // biggest N peaks (simple) – no heavy peak finding (you already have analyzeVibeJourney)
  const marks = [...data]
    .sort((a, b) => b.energy - a.energy)
    .slice(0, Math.min(peaks, data.length));

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
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <LinearGradient id="vibeArcGradient" from={color} to="transparent" toOpacity={0} />
        {/* fill */}
        <AreaClosed<Sample>
          data={data}
          x={d => xScale(new Date(toMs(d.t)))}
          y={d => yScale(d.energy)}
          yScale={yScale}
          stroke="none"
          fill="url(#vibeArcGradient)"
          curve={curveMonotoneX}
        />
        {/* line */}
        <LinePath<Sample>
          data={data}
          x={d => xScale(new Date(toMs(d.t)))}
          y={d => yScale(d.energy)}
          stroke={color}
          strokeWidth={2}
          curve={curveMonotoneX}
        />
        {/* peak dots */}
        {marks.map((p, i) => (
          <Circle
            key={i}
            cx={xScale(new Date(toMs(p.t)))}
            cy={yScale(p.energy)}
            r={3.5}
            fill={color}
            fillOpacity={0.9}
          />
        ))}
        {/* hit rect for tooltip */}
        <Bar
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
          onMouseMove={(e) => onMove(e.clientX, e.currentTarget as unknown as HTMLElement)}
          onTouchMove={(e) => onMove((e.changedTouches?.[0]?.clientX ?? 0), e.currentTarget as unknown as HTMLElement)}
          onMouseLeave={hideTooltip}
        />
      </svg>

      {tooltipData && (
        <Tooltip left={tooltipLeft} top={tooltipTop} style={{ ...defaultStyles, background: '#111', color: '#fff' }}>
          <div><strong>{Math.round((tooltipData as Sample).energy * 100)}%</strong> energy</div>
          <div>{new Date(toMs((tooltipData as Sample).t)).toLocaleTimeString()}</div>
        </Tooltip>
      )}
    </div>
  );
};

export const VibeArcChart = withTooltip<Sample>(Inner as any);