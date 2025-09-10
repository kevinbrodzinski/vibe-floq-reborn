// src/components/flow/VibeArcChart.tsx
// Lightweight Visx energy-over-time chart with soft gradient fill and peak markers.
// Props are minimal; pass your normalized energy samples (0..1).

import React from 'react';
import { Group } from '@visx/group';
import { scaleLinear, scaleTime } from '@visx/scale';
import { LinePath, AreaClosed, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { withTooltip, Tooltip, defaultStyles } from '@visx/tooltip';

type Sample = { t: number; energy: number };

export type VibeArcChartProps = {
  data: Sample[];               // [{t: UNIXms, energy: 0..1}]
  width: number;
  height: number;
  padding?: number;
  color?: string;
  peaks?: number;               // mark top N peaks
};

function VibeArcInner({
  data,
  width,
  height,
  padding = 16,
  color = '#8b5cf6', // violet-500
  peaks = 3,
  showTooltip,
  hideTooltip,
  tooltipData,
  tooltipLeft,
  tooltipTop,
}: any) {
  if (width < 10 || height < 10) return null;

  const xMin = padding, xMax = width - padding;
  const yMin = padding, yMax = height - padding;

  const domainX = data.length ? [new Date(data[0].t), new Date(data[data.length - 1].t)] : [new Date(), new Date()];
  const domainY: [number, number] = [0, 1];

  const xScale = scaleTime<number>({
    domain: domainX as [Date, Date],
    range: [xMin, xMax],
  });
  const yScale = scaleLinear<number>({
    domain: domainY,
    range: [yMax, yMin],
    nice: true,
  });

  // peak detection (simple)
  const sorted = [...data].sort((a,b)=> b.energy - a.energy);
  const marks = sorted.slice(0, Math.min(peaks, data.length));

  const onMouseMove = (e: React.MouseEvent<SVGRectElement>) => {
    const { left } = (e.currentTarget.parentNode as any).getBoundingClientRect();
    const x = e.clientX - left;
    const xDate = xScale.invert(x);
    // find nearest
    const idx = nearestIndex(data, xDate.getTime());
    const d = data[idx];
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(new Date(d.t)),
      tooltipTop: yScale(d.energy),
    });
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <LinearGradient id="vibeArcGradient" from={color} to="#000000" toOpacity={0} fromOpacity={0.5} />

        <Group>
          {/* Fill */}
          <AreaClosed<Sample>
            data={data}
            x={d => xScale(new Date(d.t)) ?? 0}
            y={d => yScale(d.energy) ?? 0}
            yScale={yScale}
            stroke="none"
            fill="url(#vibeArcGradient)"
            curve={curveMonotoneX}
          />
          {/* Line */}
          <LinePath<Sample>
            data={data}
            x={d => xScale(new Date(d.t)) ?? 0}
            y={d => yScale(d.energy) ?? 0}
            stroke={color}
            strokeWidth={2}
            curve={curveMonotoneX}
          />
          {/* Peaks */}
          {marks.map((p: Sample, i: number) => (
            <circle
              key={i}
              cx={xScale(new Date(p.t))}
              cy={yScale(p.energy)}
              r={4}
              fill="#fff"
              stroke={color}
              strokeWidth={2}
            />
          ))}
          {/* Tooltip target */}
          <Bar
            x={xMin}
            y={yMin}
            width={xMax - xMin}
            height={yMax - yMin}
            fill="transparent"
            onMouseMove={onMouseMove}
            onMouseLeave={hideTooltip}
            onTouchStart={(e: any) => onMouseMove(e as any)}
            onTouchMove={(e: any) => onMouseMove(e as any)}
          />
        </Group>
      </svg>

      {tooltipData && (
        <Tooltip
          top={tooltipTop}
          left={tooltipLeft}
          style={{ ...defaultStyles, background: '#111827', color: 'white', border: '1px solid #374151' }}
        >
          <div className="text-xs">
            <div><strong>{Math.round(tooltipData.energy * 100)}%</strong> energy</div>
            <div>{new Date(tooltipData.t).toLocaleTimeString()}</div>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

function nearestIndex(data: Sample[], tMs: number) {
  if (data.length <= 1) return 0;
  // binary-ish scan
  let lo = 0, hi = data.length - 1;
  while (hi - lo > 1) {
    const mid = (hi + lo) >> 1;
    if (data[mid].t < tMs) lo = mid; else hi = mid;
  }
  // closest of lo/hi
  return (tMs - data[lo].t) <= (data[hi].t - tMs) ? lo : hi;
}

export const VibeArcChart = withTooltip<VibeArcChartProps, Sample>(VibeArcInner as any);