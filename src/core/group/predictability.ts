export function omegaSpread(probabilities: number[]): number {
  if (!probabilities.length) return 1;
  const s = [...probabilities].sort((a, b) => a - b);
  const pick = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
  return clamp01(pick(0.9) - pick(0.1));
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
  return Math.max(0, H(before) - H(after));
}

/** groupPreds: per-member probability distribution over actions */
export function predictabilityGate(groupPreds: number[][], omegaStar = 0.35, tau = 0.15) {
  if (!groupPreds.length || !groupPreds[0]?.length)
    return { ok: false, spread: 1, gain: 0, fallback: 'relax_constraints' };

  const m0 = groupPreds[0].length;
  const agg = Array.from({ length: m0 }, (_, i) => 
    groupPreds.reduce((a, row) => a + (row[i] ?? 0), 0)
  );
  
  const spread = omegaSpread(agg);
  const gain = infoGainEntropy(groupPreds[0], agg);
  const ok = (spread <= omegaStar) && (gain >= tau);
  
  return { 
    ok, 
    spread, 
    gain, 
    fallback: ok ? null : (spread > omegaStar ? 'partition' : 'relax_constraints')
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));