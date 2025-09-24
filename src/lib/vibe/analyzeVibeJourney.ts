// src/lib/vibe/analyzeVibeJourney.ts
export type VibePoint = {
  t: number | Date;         // ms since epoch or Date
  energy: number;           // 0..1
  valence?: number;         // 0..1 (optional)
  source?: string;
  confidence?: number;      // 0..1 (optional)
};

export type MomentumPeak = {
  idx: number;
  t: number;                // ms
  energy: number;           // 0..1
  prominence: number;       // 0..1
};

export type VibeShift = {
  fromIdx: number;
  toIdx: number;
  kind: 'surge' | 'drop' | 'swing';
  delta: number;            // signed energy delta (0..1)
  durationMs: number;
};

export type VibeJourneyResult = {
  arc: {
    trajectory: VibePoint[];
    peaks: MomentumPeak[];
    valleys: MomentumPeak[];
    transitions: VibeShift[];
  };
  patterns: {
    type: 'building' | 'steady' | 'volatile' | 'declining';
    signature: string;
    consistency: number;    // 0..1 (1 = very consistent)
    slope: number;          // avg slope (energy per second)
    volatility: number;     // stddev of first-difference (per sample)
  };
};

type Opts = {
  smoothWindow?: number;        // MA window in points (default 5)
  minPeakProminence?: number;   // default 0.12
  minSeparation?: number;       // min points between peaks (default 3)
  minTransitionDelta?: number;  // energy delta to flag (default 0.18)
  cooldown?: number;            // samples to wait after transition (default 3)
};

// ---------- helpers ----------
const toMs = (t: number | Date) => (t instanceof Date ? t.getTime() : t);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const mean = (arr: number[]) => (arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0);
const std = (arr: number[]) => {
  if (arr.length < 2) return 0;
  const m = mean(arr); const v = mean(arr.map(x => (x - m) ** 2));
  return Math.sqrt(v);
};

function movingAvg(arr: number[], w: number) {
  if (w <= 1) return arr.slice();
  const out: number[] = new Array(arr.length);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= w) sum -= arr[i - w];
    out[i] = i >= w - 1 ? sum / w : sum / (i + 1);
  }
  return out;
}

function localProminence(series: number[], i: number, span: number) {
  // baseline = max of nearest lower “shoulders” around the peak; here use local min left/right nearest
  const L = Math.max(0, i - span), R = Math.min(series.length - 1, i + span);
  let leftMin = Infinity, rightMin = Infinity;
  for (let j = L; j <= i; j++) leftMin = Math.min(leftMin, series[j]);
  for (let j = i; j <= R; j++) rightMin = Math.min(rightMin, series[j]);
  const base = Math.max(leftMin, rightMin);
  return clamp01(series[i] - base);
}

function findPeaks(series: number[], span: number, minProm: number, minSep: number): MomentumPeak[] {
  const peaks: MomentumPeak[] = [];
  for (let i = 1; i < series.length - 1; i++) {
    if (series[i] > series[i-1] && series[i] > series[i+1]) {
      const prom = localProminence(series, i, span);
      if (prom >= minProm) peaks.push({ idx: i, t: 0, energy: series[i], prominence: prom });
    }
  }
  // enforce separation by keeping highest prominence within windows
  peaks.sort((a,b) => b.prominence - a.prominence);
  const chosen: MomentumPeak[] = [];
  const used = new Set<number>();
  for (const p of peaks) {
    let ok = true;
    for (let k = -minSep; k <= minSep; k++) {
      if (used.has(p.idx + k)) { ok = false; break; }
    }
    if (ok) {
      chosen.push(p);
      for (let k = -minSep; k <= minSep; k++) used.add(p.idx + k);
    }
  }
  return chosen.sort((a,b) => a.idx - b.idx);
}

function invertPeaks(series: number[], span: number, minProm: number, minSep: number) {
  const inv = series.map(x => 1 - x);
  return findPeaks(inv, span, minProm, minSep).map(v => ({ ...v, energy: series[v.idx] }));
}

function classifyPattern(smoothed: number[], timesMs: number[]) {
  if (smoothed.length < 2) return { type:'steady' as const, slope:0, volatility:0, consistency:1, signature:'evening steady' };
  const dt = (timesMs.at(-1)! - timesMs[0]) / 1000; // seconds
  const slope = dt > 0 ? (smoothed.at(-1)! - smoothed[0]) / dt : 0;
  const diffs = smoothed.slice(1).map((x,i)=> x - smoothed[i]);
  const volatility = std(diffs);
  // thresholds tuned for 0..1 energy sampled ~10-60s
  const absSlope = Math.abs(slope);
  let type: 'building' | 'steady' | 'volatile' | 'declining' = 'steady';
  if (absSlope < 0.00005 && volatility < 0.02) type = 'steady';
  else if (slope > 0.00005 && volatility < 0.05) type = 'building';
  else if (slope < -0.00005 && volatility < 0.05) type = 'declining';
  else type = 'volatile';
  const consistency = clamp01(1 - volatility * 10);
  // cute signature heuristic based on where dominant peak lies
  const dominantIdx = smoothed.indexOf(Math.max(...smoothed));
  const frac = dominantIdx / (smoothed.length - 1 || 1);
  const signature =
    frac > 0.66 ? 'late peaker' :
    frac < 0.33 ? 'early peaker' :
    'mid-evening peaker';
  return { type, slope, volatility, consistency, signature };
}

function detectTransitions(smoothed: number[], timesMs: number[], minDelta: number, cooldown: number): VibeShift[] {
  const shifts: VibeShift[] = [];
  let lastIdx = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const delta = smoothed[i] - smoothed[lastIdx];
    if (Math.abs(delta) >= minDelta && i - lastIdx >= cooldown) {
      shifts.push({
        fromIdx: lastIdx,
        toIdx: i,
        kind: delta > 0 ? 'surge' : 'drop',
        delta,
        durationMs: timesMs[i] - timesMs[lastIdx],
      });
      lastIdx = i;
    }
  }
  // strong direction change inside short window → tag as swing
  for (let i = 1; i < shifts.length; i++) {
    const a = shifts[i-1], b = shifts[i];
    if (Math.sign(a.delta) !== Math.sign(b.delta) && b.durationMs < 12 * 60 * 1000) {
      b.kind = 'swing';
    }
  }
  return shifts;
}

// ---------- main ----------
export function analyzeVibeJourney(
  input: VibePoint[],
  opts: Opts = {}
): VibeJourneyResult {
  const {
    smoothWindow = 5,
    minPeakProminence = 0.12,
    minSeparation = 3,
    minTransitionDelta = 0.18,
    cooldown = 3,
  } = opts;

  if (!input?.length) {
    return {
      arc: { trajectory: [], peaks: [], valleys: [], transitions: [] },
      patterns: { type: 'steady', signature: 'no data', consistency: 1, slope: 0, volatility: 0 },
    };
  }

  // Normalize + sort by time
  const traj = input
    .map(p => ({ ...p, t: toMs(p.t), energy: clamp01(p.energy) }))
    .sort((a,b) => (a.t as number) - (b.t as number));

  // Smoothing
  const energy = traj.map(p => p.energy);
  const smoothed = movingAvg(energy, Math.max(1, smoothWindow));
  const timesMs = traj.map(p => p.t as number);

  // Peaks & valleys
  const span = Math.max(2, Math.round(smoothWindow)); // local window span
  const peaks = findPeaks(smoothed, span, minPeakProminence, minSeparation)
    .map(p => ({ ...p, t: timesMs[p.idx] }));
  const valleys = invertPeaks(smoothed, span, minPeakProminence, minSeparation)
    .map(v => ({ ...v, t: timesMs[v.idx] }));

  // Transitions
  const transitions = detectTransitions(smoothed, timesMs, minTransitionDelta, cooldown);

  // Pattern classification
  const { type, slope, volatility, consistency, signature } = classifyPattern(smoothed, timesMs);

  return {
    arc: { trajectory: traj, peaks, valleys, transitions },
    patterns: { type, signature, consistency, slope, volatility },
  };
}
