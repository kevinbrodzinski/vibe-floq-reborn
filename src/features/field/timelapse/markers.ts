export type TLMarkerKind = 'cascade' | 'aurora' | 'peak';
export type TLMarker = { t: number; kind: TLMarkerKind; strength: number };

export function extractMarkers(frame: {
  t: number;
  storms: Float32Array;         // [x,y,intensity] * Ns
  aurora: Uint8Array;           // [activeCount]
  cascadeHotspots?: number;     // (optional) pass live count if you have it
}): TLMarker[] {
  const out: TLMarker[] = [];
  
  // Cascade: any hotspots this tick?
  if ((frame as any).cascadeHotspots && (frame as any).cascadeHotspots > 0) {
    out.push({ 
      t: frame.t, 
      kind: 'cascade', 
      strength: Math.min(1, (frame as any).cascadeHotspots / 6) 
    });
  }
  
  // Aurora peak
  const a = frame.aurora?.[0] ?? 0;
  if (a >= 1) {
    out.push({ 
      t: frame.t, 
      kind: 'aurora', 
      strength: Math.min(1, a / 3) 
    });
  }

  // Storm intensity "peak": mean intensity > .75
  const storms = frame.storms ?? new Float32Array(0);
  let mean = 0, n = (storms.length / 3) | 0;
  for (let i = 2; i < storms.length; i += 3) mean += storms[i];
  if (n > 0) {
    mean /= n;
    if (mean > 0.75) {
      out.push({ 
        t: frame.t, 
        kind: 'peak', 
        strength: Math.min(1, (mean - 0.75) / 0.25) 
      });
    }
  }

  return out;
}