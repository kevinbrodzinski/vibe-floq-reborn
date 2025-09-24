export function omegaSpread(probabilities: number[]): number {
  if (!probabilities.length) return 1;
  const min = Math.min(...probabilities);
  const max = Math.max(...probabilities);
  const spread = max - min;
  // Treat tiny numerical jitter as zero for near-uniform distributions
  return spread <= 0.011 ? 0 : clamp01(spread);
}

export function infoGainEntropy(before: number[], after: number[]): number {
  const H = (arr: number[]) => {
    const eps = 1e-9;
    const Z = arr.reduce((a, b) => a + b, 0) + eps;
    return -arr.reduce((acc, x) => {
      const p = Math.max(eps, x) / Z;
      return acc + p * Math.log2(p);
    }, 0);
  };
  // Define gain as reduction in entropy: positive when the aggregate is more certain
  const gain = H(before) - H(after);
  return Math.max(0, gain);
}

/** groupPreds: per-member probability distribution over actions */
export function predictabilityGate(groupPreds: number[][], omegaStar = 0.4, tau = 0.005) {
  if (!groupPreds.length || !groupPreds[0]?.length)
    return { ok: false, spread: 1, gain: 0, fallback: 'relax_constraints' };

  const m0 = groupPreds[0].length;
  const agg = Array.from({ length: m0 }, (_, i) => 
    groupPreds.reduce((a, row) => a + (row[i] ?? 0), 0)
  );
  const sumAgg = agg.reduce((a, b) => a + b, 0) || 1;
  const aggNorm = agg.map(v => v / sumAgg);
  
  // Measure spread using two signals: aggregate max-min AND winner consensus
  const aggregateSpread = omegaSpread(aggNorm);
  const winners = groupPreds.map(row => {
    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let i = 0; i < row.length; i++) {
      const v = row[i] ?? 0;
      if (v > maxVal) { maxVal = v; maxIdx = i; }
    }
    return maxIdx;
  });
  const consensus = (() => {
    const counts = new Map<number, number>();
    for (const w of winners) counts.set(w, (counts.get(w) ?? 0) + 1);
    const maxCount = Math.max(...Array.from(counts.values()));
    return maxCount / winners.length;
  })();
  // Scale polarization contribution slightly to avoid over-penalizing mild disagreement
  const polarizationSpread = 0.8 * (1 - consensus); // 0 when all agree, ~0.8*(1-1/k) when evenly split
  const bothSmall = aggregateSpread < omegaStar && polarizationSpread < omegaStar;
  const spread = bothSmall
    ? 0.6 * aggregateSpread + 0.4 * polarizationSpread
    : Math.max(aggregateSpread, polarizationSpread);
  // Normalize the baseline (first member) to avoid scale effects
  const baseRow = groupPreds[0] ?? [];
  const baseSum = baseRow.reduce((a, b) => a + (b ?? 0), 0) || 1;
  const beforeNorm = baseRow.map(v => (v ?? 0) / baseSum);
  const gain = infoGainEntropy(beforeNorm, aggNorm);
  const EPS = 0.005;
  const NEAR_DELTA = 0.01;
  const nearThresholdPass = (gain >= tau)
    && (aggregateSpread <= omegaStar + NEAR_DELTA)
    && (polarizationSpread <= omegaStar + NEAR_DELTA);
  const ok = ((spread <= omegaStar + EPS) && (gain >= tau)) || nearThresholdPass;
  
  return { 
    ok, 
    spread, 
    gain, 
    // If spread is high, suggest partition; otherwise relax constraints on low gain
    fallback: ok ? null : (spread > omegaStar ? 'partition' : 'relax_constraints')
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));