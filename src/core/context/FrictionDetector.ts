import type { ContextFactWithId, TransitionFact } from './types';
import { isTransition } from './types';

export interface FrictionSignal {
  kind: 'hesitation' | 'backtracking' | 'repetition' | 'abandonment';
  score01: number;            // 0..1
  samples: number;
  details?: string;
}

export interface FrictionReport {
  t: number;
  signals: FrictionSignal[];
  overall01: number;          // weighted combination
  suggestions: string[];      // human-readable actions
}

export interface FrictionConfig {
  windowMs: number;       // analysis window
  hesitationMs: number;   // latency threshold
  repetitionN: number;    // repeated same edge threshold
  backtrackMaxGapMs: number; // max time for A→B→A backtracking
}

const DEFAULT_CFG: FrictionConfig = {
  windowMs: 10 * 60_000,       // 10 minutes
  hesitationMs: 2_000,         // >2s transition latency == hesitation sample
  repetitionN: 3,              // 3+ same transitions within window
  backtrackMaxGapMs: 90_000,   // A→B→A within 90s
};

export function detectFriction(
  facts: ContextFactWithId[],
  now = Date.now(),
  cfg: FrictionConfig = DEFAULT_CFG
): FrictionReport {
  const since = now - cfg.windowMs;
  const tf = facts.filter(f => isTransition(f) && f.t >= since) as (ContextFactWithId & TransitionFact)[];
  const signals: FrictionSignal[] = [];

  if (tf.length === 0) {
    return { t: now, signals: [], overall01: 0, suggestions: [] };
  }

  // --- Hesitation (long latencies) ---
  const hesSamples = tf.filter(f => (f.data.latencyMs ?? 0) >= cfg.hesitationMs);
  if (hesSamples.length) {
    const score = clamp01(hesSamples.length / Math.max(3, tf.length));
    signals.push({
      kind: 'hesitation', score01: score, samples: hesSamples.length,
      details: `>=${cfg.hesitationMs}ms in ${hesSamples.length}/${tf.length} transitions`
    });
  }

  // --- Repetition (same edge spam) ---
  const edgeCount = new Map<string, number>();
  tf.forEach(f => {
    const k = `${f.data.from}→${f.data.to}`;
    edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
  });
  const repeated = [...edgeCount.entries()].filter(([,n]) => n >= cfg.repetitionN);
  if (repeated.length) {
    const peak = Math.max(...repeated.map(([,n]) => n));
    signals.push({
      kind: 'repetition',
      score01: clamp01(peak / (cfg.repetitionN * 2)), // normalize gently
      samples: repeated.length,
      details: repeated.map(([k,n]) => `${k}×${n}`).join(', ')
    });
  }

  // --- Backtracking (A→B→A within gap) ---
  let backtracks = 0;
  for (let i = 2; i < tf.length; i++) {
    const a = tf[i-2], b = tf[i-1], c = tf[i];
    if (a.data.from === c.data.to && a.data.to === c.data.from) {
      if ((c.t - a.t) <= cfg.backtrackMaxGapMs) backtracks++;
    }
  }
  if (backtracks) {
    signals.push({
      kind: 'backtracking',
      score01: clamp01(backtracks / Math.max(2, tf.length / 3)),
      samples: backtracks,
      details: `A→B→A patterns: ${backtracks}`
    });
  }

  // --- Abandonment (end on home/unknown after hesitation) ---
  const last = tf[tf.length - 1];
  if ((last.data.latencyMs ?? 0) >= cfg.hesitationMs && /home|start|unknown/i.test(last.data.to)) {
    signals.push({
      kind: 'abandonment',
      score01: 0.5,
      samples: 1,
      details: `ended at ${last.data.to} after long latency`
    });
  }

  // Overall
  const overall01 = clamp01(
    weighted(signals, { hesitation:0.35, backtracking:0.25, repetition:0.2, abandonment:0.2 })
  );

  const suggestions: string[] = [];
  if (getScore(signals,'hesitation') > 0.4) {
    suggestions.push('Prefetch next screen assets and reduce synchronous work in transitions.');
  }
  if (getScore(signals,'backtracking') > 0.3) {
    suggestions.push('Surface "Back to previous step" CTA or breadcrumb in the current view.');
  }
  if (getScore(signals,'repetition') > 0.3) {
    suggestions.push('Offer quick action for the repeated path (shortcut or saved task).');
  }
  if (getScore(signals,'abandonment') > 0.3) {
    suggestions.push('Add "Resume where you left off" banner on the home/start screen.');
  }

  return { t: now, signals, overall01, suggestions };
}

/** --------- utils --------- */
const clamp01 = (n:number) => Math.max(0, Math.min(1, n));

function weighted(signals: FrictionSignal[], w: Record<FrictionSignal['kind'], number>) {
  let s = 0, d = 0;
  for (const sig of signals) {
    const ww = w[sig.kind] ?? 0.25;
    s += sig.score01 * ww; d += ww;
  }
  return d ? s / d : 0;
}

function getScore(signals: FrictionSignal[], kind: FrictionSignal['kind']) {
  return signals.find(s => s.kind === kind)?.score01 ?? 0;
}