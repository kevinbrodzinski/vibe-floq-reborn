import type { EnergySample } from '@/lib/share/generatePostcardClient';

type VibePoint = { t: number | string | Date; energy: number };
type Peak = { t: number | string | Date; energy: number };
type Valley = { t: number | string | Date; energy: number };
type Transition = { t: number | string | Date; kind: string };

export type VibeAnalysis = {
  arc: { trajectory: VibePoint[]; peaks: Peak[]; valleys: Valley[]; transitions: Transition[] };
  patterns: { type: 'building'|'steady'|'volatile'|'declining'; signature: string; consistency: number };
};

export type ChartMarker = { 
  t: number | Date | string; 
  energy: number; 
  kind: 'peak'|'valley'|'transition'; 
  label?: string 
};

const toMs = (v: number|string|Date) => 
  (typeof v === 'number' ? v : (v instanceof Date ? v.getTime() : new Date(v).getTime()));

export function markersFromVibe(analysis: any, samples: EnergySample[]): ChartMarker[] {
  if (!analysis?.peaks?.length && !analysis?.valleys?.length && !analysis?.transitions?.length || !samples?.length) return [];

  const out: ChartMarker[] = [];
  
  for (const p of analysis.peaks ?? []) {
    out.push({ 
      t: p.t, 
      energy: p.energy, 
      kind: 'peak' 
    });
  }
  
  for (const v of analysis.valleys ?? []) {
    out.push({ 
      t: v.t, 
      energy: v.energy, 
      kind: 'valley' 
    });
  }
  
  for (const tr of analysis.transitions ?? []) {
    out.push({ 
      t: tr.t, 
      energy: 0.5, 
      kind: 'transition', 
      label: tr.kind 
    });
  }
  
  return out;
}

// Simple vibe journey analyzer for now - can be enhanced later
export function analyzeVibeJourney(
  samples: Array<{ t: number | Date | string; energy: number }>,
  opts: { smooth?: number; peakMinProminence?: number; transitionMinDelta?: number } = {}
): VibeAnalysis {
  const { smooth = 3, peakMinProminence = 0.08, transitionMinDelta = 0.12 } = opts;
  
  if (samples.length < 2) {
    return {
      arc: { trajectory: [], peaks: [], valleys: [], transitions: [] },
      patterns: { type: 'steady', signature: 'insufficient-data', consistency: 0 }
    };
  }

  // Simple smoothing
  const smoothed = samples.map((sample, i) => {
    const start = Math.max(0, i - Math.floor(smooth / 2));
    const end = Math.min(samples.length - 1, i + Math.floor(smooth / 2));
    const sum = samples.slice(start, end + 1).reduce((acc, s) => acc + s.energy, 0);
    const count = end - start + 1;
    return { ...sample, energy: sum / count };
  });

  // Find peaks and valleys
  const peaks: Peak[] = [];
  const valleys: Valley[] = [];
  
  for (let i = 1; i < smoothed.length - 1; i++) {
    const prev = smoothed[i - 1].energy;
    const curr = smoothed[i].energy;
    const next = smoothed[i + 1].energy;
    
    if (curr > prev && curr > next && curr - Math.min(prev, next) > peakMinProminence) {
      peaks.push({ t: smoothed[i].t, energy: curr });
    } else if (curr < prev && curr < next && Math.max(prev, next) - curr > peakMinProminence) {
      valleys.push({ t: smoothed[i].t, energy: curr });
    }
  }

  // Find transitions (significant energy changes)
  const transitions: Transition[] = [];
  for (let i = 1; i < smoothed.length; i++) {
    const delta = smoothed[i].energy - smoothed[i - 1].energy;
    if (Math.abs(delta) > transitionMinDelta) {
      transitions.push({
        t: smoothed[i].t,
        kind: delta > 0 ? 'rising' : 'falling'
      });
    }
  }

  // Determine pattern
  const energies = smoothed.map(s => s.energy);
  const trend = energies[energies.length - 1] - energies[0];
  const variance = energies.reduce((sum, e) => sum + Math.pow(e - energies.reduce((a, b) => a + b) / energies.length, 2), 0) / energies.length;
  
  let type: 'building' | 'steady' | 'volatile' | 'declining';
  if (variance > 0.05) {
    type = 'volatile';
  } else if (trend > 0.1) {
    type = 'building';
  } else if (trend < -0.1) {
    type = 'declining';
  } else {
    type = 'steady';
  }

  const consistency = Math.max(0, 1 - variance * 4);

  return {
    arc: {
      trajectory: smoothed,
      peaks,
      valleys,
      transitions
    },
    patterns: {
      type,
      signature: `${type}-${peaks.length}p-${valleys.length}v`,
      consistency
    }
  };
}