import React, { useMemo } from 'react';
import type { TLMarker } from './markers';

const COLOR: Record<TLMarker['kind'], string> = {
  cascade: '#60a5fa', // blue-400
  aurora:  '#a78bfa', // violet-400
  peak:    '#f59e0b', // amber-500
};

export function MarkerTrack({
  markers, range, width, onSeek
}: { 
  markers: TLMarker[]; 
  range: [number, number]; 
  width: number; 
  onSeek: (ts: number) => void 
}) {
  const [t0, t1] = range;
  const items = useMemo(() => markers.map(m => ({
    left: Math.round(((m.t - t0) / Math.max(1, t1 - t0)) * width),
    color: COLOR[m.kind],
    ts: m.t,
    size: 6 + Math.round(m.strength * 6)
  })), [markers, range, width]);

  return (
    <div style={{ 
      position: 'absolute', 
      left: 0, 
      right: 0, 
      bottom: 38, 
      height: 0, 
      pointerEvents: 'none' 
    }}>
      {items.map((it, i) => (
        <div 
          key={i}
          onClick={() => onSeek(it.ts)}
          style={{
            position: 'absolute', 
            left: it.left - 4, 
            bottom: -3, 
            width: it.size, 
            height: it.size,
            borderRadius: 999, 
            background: it.color, 
            boxShadow: `0 0 8px ${it.color}`,
            cursor: 'pointer', 
            pointerEvents: 'auto'
          }}
          title={new Date(it.ts).toLocaleTimeString()}
        />
      ))}
    </div>
  );
}