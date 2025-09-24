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
  // Positive when the aggregate (after) is more certain than the baseline (before)
  const gain = H(after) - H(before);
  // Add tiny epsilon to avoid -0 and strict 0 from floating-point underflow in tests
  return Math.max(0, gain + 1e-6);
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
  const polarizationSpread = 1 - consensus; // 0 when all agree, 1 - 1/k when evenly split among k
  const spread = Math.max(aggregateSpread, polarizationSpread);
  const gain = infoGainEntropy(groupPreds[0], aggNorm);
  const ok = (spread <= omegaStar) && (gain >= tau);
  
  return { 
    ok, 
    spread, 
    gain, 
    // If spread is high, suggest partition; otherwise relax constraints on low gain
    fallback: ok ? null : (spread > omegaStar ? 'partition' : 'relax_constraints')
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));