/* -----------------------------------------------------------------------------
 * Floq — Invite Option Engine (stub, production-ready skeleton)
 * Turns a relationship tensor + context into ranked, formatted invite options.
 * No external deps. All scores are normalized 0..1, with sensible fallbacks.
 * ---------------------------------------------------------------------------*/

export type DecayRate = 'stable' | 'cooling' | 'warming';

export type RelationshipTensor = {
  // Observable signals (0..1 unless otherwise noted)
  interactionFrequency: number;      // how often (0..1)
  interactionDuration: number;       // avg session length (hours 0..8 — will be normalized)
  initiationBalance: number;         // who reaches out (-1 .. +1); + favors me
  responseLatency: number;           // hours to respond (0..48 — will be inverted/normalized)

  // Derived signals (0..1)
  synchronicity: number;             // moving together vs separately
  vibeAlignment: number;             // emotional state correlation
  temporalOverlap: number;           // active at same times
  venueAffinity: number;             // like same places

  // Decay functions
  lastSync: Date | string;           // last hangout or meaningful DM
  decayRate: DecayRate;

  // Mutual signals (0..1)
  mutualPriority: number;            // both mark as close
  sharedExperiences: number;         // co-located events
  photoCoPresence: number;           // appear in photos together
};

export type VibeState = 'chill' | 'focus' | 'romance' | 'hype' | 'calm' | 'cozy' | 'social';
export type Proximity = 'near' | 'medium' | 'far';
export type ActivityState = 'idle' | 'moving' | 'at-venue';

export type SmartInviteContext = {
  theirVibe: VibeState;
  theirLocation: Proximity;
  theirActivity: ActivityState;
  lastInvite?: Date | string;
  prediction?: {
    responseProb?: number;       // 0..1 model score
    optimalTiming?: Date | string;
    frictionScore?: number;      // 0..1 (0=low friction)
  };
};

export type InviteKind =
  | 'spontaneous'       // rally now / join me
  | 'planned'           // perfect window later
  | 'reconnect'         // relationship repair
  | 'lowkey'            // coffee / walk / quiet
  | 'highenergy'        // live venue / hype pivot
  | 'bridge-groups'     // merge crews / meet halfway
  | 'food'              // eat together
  | 'venue'             // specific place
  | 'custom';

export type Friction = 'low' | 'medium' | 'high';

export type InviteOption = {
  kind: InviteKind;
  text: string;
  when?: string;              // formatted e.g., '7:30 pm'
  at?: Date;                  // actual Date if planned
  friction: Friction;
  successProb: number;        // 0..1
  score: number;              // 0..1 (rank key)
  rationale: string[];        // brief reasons for UI/tooltip
  tags?: string[];            // e.g. ['near','window','warming']
  payload?: Record<string, unknown>; // attach IDs, venue hints, etc.
};

// ------------------------------ Config --------------------------------------

// All weights are soft defaults; tune per-product.
export const INVITE_WEIGHTS = {
  // Base tie strength
  freq: 0.22, dur: 0.07, init: 0.05, latencyInv: 0.08,
  mutual: 0.18, shared: 0.10, photos: 0.06,
  synch: 0.08, vibe: 0.08, timeOverlap: 0.04, venue: 0.04,

  // Context multipliers
  nearBoost: 1.15, idleBoost: 1.10, atVenueBoost: 1.05,
  farPenalty: 0.82, movingPenalty: 0.92,

  // Cooldown & decay (hours / days)
  inviteCooldownHrs: 1.5,
  recencyHalfLifeDays: 21,

  // Friction normalization (lower is better)
  frictionClamp: [0.1, 0.9] as [number, number],
};

// ------------------------------ Utils ---------------------------------------

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function hoursSince(d?: Date | string) {
  if (!d) return Infinity;
  const t = typeof d === 'string' ? Date.parse(d) : d.getTime();
  return (Date.now() - t) / 36e5;
}
function daysSince(d?: Date | string) {
  if (!d) return Infinity;
  const t = typeof d === 'string' ? Date.parse(d) : d.getTime();
  return (Date.now() - t) / 864e5;
}

function expDecay(days: number, halfLife: number) {
  if (!isFinite(days) || !isFinite(halfLife) || halfLife <= 0) return 0;
  return Math.exp(-(days * Math.log(2)) / halfLife);
}

function normDuration(h: number) { return clamp01(h / 4); }           // 0..4h
function invLatency(hours: number) { return clamp01(1 - (hours / 24)); } // 0 fast .. 1 slow→0

function fmtTime(d?: Date | string) {
  if (!d) return undefined;
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function frictionToLabel(x: number): Friction {
  if (x <= 0.33) return 'low';
  if (x <= 0.66) return 'medium';
  return 'high';
}

// ------------------------------ Scoring -------------------------------------

export function scoreTie(t: RelationshipTensor): number {
  const w = INVITE_WEIGHTS;
  const rec = expDecay(daysSince(t.lastSync), INVITE_WEIGHTS.recencyHalfLifeDays);

  // [-1..1] initiationBalance → favor me initiating (positive)
  const initAdj = clamp01((t.initiationBalance + 1) / 2);

  // Invert latency (hours → 0 quick to 1 slow)
  const latencyInv = invLatency(t.responseLatency);

  // Composite score (0..1)
  const s =
    w.freq        * clamp01(t.interactionFrequency) +
    w.dur         * normDuration(t.interactionDuration) +
    w.init        * initAdj +
    w.latencyInv  * latencyInv +
    w.mutual      * clamp01(t.mutualPriority) +
    w.shared      * clamp01(t.sharedExperiences) +
    w.photos      * clamp01(t.photoCoPresence) +
    w.synch       * clamp01(t.synchronicity) +
    w.vibe        * clamp01(t.vibeAlignment) +
    w.timeOverlap * clamp01(t.temporalOverlap) +
    w.venue       * clamp01(t.venueAffinity);

  // Decay by recency (fresh ties pop more)
  return clamp01(s * (0.6 + 0.4 * rec));
}

function contextMultiplier(ctx: SmartInviteContext): number {
  let m = 1;
  switch (ctx.theirLocation) {
    case 'near':   m *= INVITE_WEIGHTS.nearBoost; break;
    case 'far':    m *= INVITE_WEIGHTS.farPenalty; break;
    default: break;
  }
  switch (ctx.theirActivity) {
    case 'idle':   m *= INVITE_WEIGHTS.idleBoost; break;
    case 'moving': m *= INVITE_WEIGHTS.movingPenalty; break;
    case 'at-venue': m *= INVITE_WEIGHTS.atVenueBoost; break;
    default: break;
  }
  return m;
}

function cooldownPenalty(ctx: SmartInviteContext) {
  const hrs = hoursSince(ctx.lastInvite);
  if (hrs < INVITE_WEIGHTS.inviteCooldownHrs) {
    // linear penalty up to 100% at t=0
    return clamp01(hrs / INVITE_WEIGHTS.inviteCooldownHrs);
  }
  return 1;
}

function predBoost(p?: { responseProb?: number; frictionScore?: number }) {
  if (!p) return 1;
  const rp = clamp01(p.responseProb ?? 0.5);
  const fr = clamp01(p.frictionScore ?? 0.5); // lower is better
  const [lo, hi] = INVITE_WEIGHTS.frictionClamp;
  const frN = clamp01((fr - lo) / Math.max(1e-6, hi - lo));
  // High response, low friction → strong
  return clamp01(0.6 + 0.6 * rp * (1 - frN));
}

// ------------------------- Option Builders ----------------------------------

type BuildInput = {
  tensor: RelationshipTensor;
  ctx: SmartInviteContext;
  base: number;        // tie strength 0..1
  mult: number;        // context multiplier
  cool: number;        // cooldown multiplier
  pboost: number;      // prediction boost
};

function opt(kind: InviteKind, text: string, baseScore: number, ctx: SmartInviteContext, rationale: string[], when?: Date): InviteOption {
  const frRaw = clamp01(ctx.prediction?.frictionScore ?? 0.3);
  const friction = frictionToLabel(frRaw);
  const successProb = clamp01((ctx.prediction?.responseProb ?? 0.6) * (1 - frRaw * 0.5));
  return {
    kind,
    text,
    when: fmtTime(when),
    at: when,
    friction,
    successProb,
    score: clamp01(baseScore),
    rationale,
    tags: []
  };
}

function buildSpontaneous(b: BuildInput): InviteOption {
  const tensor = b.tensor, ctx = b.ctx, base = b.base, mult = b.mult, cool = b.cool, pboost = b.pboost;
  const near = ctx.theirLocation === 'near';
  const idle = ctx.theirActivity === 'idle';
  const score = base * mult * cool * pboost * (near ? 1.1 : 0.95) * (idle ? 1.05 : 1.0);
  const text = near
    ? 'Rally here now'
    : 'Join me nearby';
  const why = [
    near ? "you're close" : "you're in range",
    idle ? "free right now" : "on the move",
    tensor.vibeAlignment >= 0.5 ? "vibes match" : "could use a vibe boost"
  ];
  return opt('spontaneous', text, score, ctx, why);
}

function buildPlanned(b: BuildInput, window?: Date): InviteOption {
  const tensor = b.tensor, ctx = b.ctx, base = b.base, mult = b.mult, cool = b.cool, pboost = b.pboost;
  const when = window ?? (ctx.prediction?.optimalTiming ? new Date(ctx.prediction.optimalTiming) : undefined);
  const score = base * 0.95 * mult * cool * pboost * (when ? 1.05 : 0.9);
  const text = when
    ? `Perfect window ${fmtTime(when)}`
    : 'Find our window';
  const why = [
    'good timing match',
    tensor.temporalOverlap >= 0.5 ? 'overlapping schedules' : 'flexible window',
  ];
  return opt('planned', text, score, ctx, why, when);
}

function buildReconnect(b: BuildInput): InviteOption {
  const tensor = b.tensor, ctx = b.ctx, base = b.base, mult = b.mult, cool = b.cool, pboost = b.pboost;
  const recency = expDecay(daysSince(tensor.lastSync), INVITE_WEIGHTS.recencyHalfLifeDays);
  const cooling = tensor.decayRate === 'cooling';
  const score = base * mult * pboost * Math.max(0.65, 0.9 - recency) * (cooling ? 1.1 : 1.0);
  const text = 'Been too long — coffee?';
  const why = [
    'cooling relationship',
    'repair with low-key plan'
  ];
  const r = opt('reconnect', text, score, ctx, why);
  r.tags = ['repair'];
  return r;
}

function buildLowkey(b: BuildInput): InviteOption {
  const tensor = b.tensor, ctx = b.ctx, base = b.base, mult = b.mult, cool = b.cool, pboost = b.pboost;
  const vibeLow = ['calm','cozy','chill'].includes(ctx.theirVibe);
  const score = base * mult * cool * pboost * (vibeLow ? 1.08 : 0.96);
  const text = 'Walk / coffee nearby';
  const why = [
    vibeLow ? 'low-key vibe match' : 'reset with calmer plan',
  ];
  return opt('lowkey', text, score, ctx, why);
}

function buildHighEnergy(b: BuildInput): InviteOption {
  const tensor = b.tensor, ctx = b.ctx, base = b.base, mult = b.mult, cool = b.cool, pboost = b.pboost;
  const vibeHi = ['hype','social'].includes(ctx.theirVibe);
  const score = base * mult * cool * pboost * (vibeHi ? 1.12 : 0.95);
  const text = 'Hit a lively spot';
  const why = [
    vibeHi ? 'high-energy match' : 'energy needs a lift',
  ];
  return opt('highenergy', text, score, ctx, why);
}

function buildBridge(b: BuildInput): InviteOption {
  const base = b.base, mult = b.mult, cool = b.cool, pboost = b.pboost;
  const score = base * 0.9 * mult * cool * pboost;
  const text = 'Meet halfway';
  const why = ['shared midpoint keeps friction low'];
  return opt('bridge-groups', text, score, b.ctx, why);
}

// ------------------------- Public API ---------------------------------------

export type GenerateOptionsInput = {
  tensor: RelationshipTensor;
  context: SmartInviteContext;
  now?: Date;
  limit?: number;              // top N
};

export function generateInviteOptions(input: GenerateOptionsInput): InviteOption[] {
  const { tensor, context: ctx } = input;
  const base = scoreTie(tensor);
  const mult = contextMultiplier(ctx);
  const cool = cooldownPenalty(ctx);
  const pboost = predBoost(ctx.prediction);

  const maybeWhen = ctx.prediction?.optimalTiming ? new Date(ctx.prediction.optimalTiming) : undefined;

  const candidates: InviteOption[] = [
    buildSpontaneous({ tensor, ctx, base, mult, cool, pboost }),
    buildPlanned({ tensor, ctx, base, mult, cool, pboost }, maybeWhen),
    buildLowkey({ tensor, ctx, base, mult, cool, pboost }),
    buildHighEnergy({ tensor, ctx, base, mult, cool, pboost }),
  ];

  if (tensor.decayRate === 'cooling' || daysSince(tensor.lastSync) > 28) {
    candidates.push(buildReconnect({ tensor, ctx, base, mult, cool, pboost }));
  }
  // Add bridge suggestion for 'far' cases
  if (ctx.theirLocation === 'far') {
    candidates.push(buildBridge({ tensor, ctx, base, mult, cool, pboost }));
  }

  // Rerank by score, apply limit, and fold in successProb (UI can also sort by score).
  const out = candidates
    .filter(c => c.score > 0.25)   // prune weak suggests
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 4);

  return out;
}

// ------------------------- Group variant ------------------------------------

export type GroupGenerateInput = {
  ids: string[];
  tensors: Record<string, RelationshipTensor>;     // per user
  contexts: Record<string, SmartInviteContext>;    // per user
  now?: Date;
  limit?: number;
};

export function generateGroupInviteOptions(input: GroupGenerateInput): InviteOption[] {
  const { ids, tensors, contexts } = input;
  if (!ids.length) return [];

  // Aggregate per-user scores for group-fit
  let base = 0, mult = 0, cool = 0, pboost = 0;
  for (const id of ids) {
    const t = tensors[id]; const ctx = contexts[id];
    if (!t || !ctx) continue;
    base   += scoreTie(t);
    mult   += contextMultiplier(ctx);
    cool   += cooldownPenalty(ctx);
    pboost += predBoost(ctx.prediction);
  }
  const n = Math.max(1, ids.length);
  base   /= n; mult /= n; cool /= n; pboost /= n;

  // Heuristics: if majority near & idle → rally now; else planned window.
  const nearCount = ids.filter(id => contexts[id]?.theirLocation === 'near').length;
  const idleCount = ids.filter(id => contexts[id]?.theirActivity === 'idle').length;
  const rallyBias = (nearCount + idleCount) / (2 * n);

  const rallyScore = clamp01(base * mult * cool * pboost * (1.0 + 0.2 * rallyBias));
  const planScore  = clamp01(base * mult * cool * pboost * (1.05 - 0.2 * rallyBias));

  const nowOpt: InviteOption = {
    kind: 'spontaneous',
    text: 'Rally the group now',
    friction: 'low',
    successProb: clamp01(0.5 + 0.4 * rallyBias),
    score: rallyScore,
    rationale: [
      `${Math.round((nearCount / n) * 100)}% near`,
      `${Math.round((idleCount / n) * 100)}% free now`,
    ],
    tags: ['group','rally']
  };

  const when = majorityWindow(contexts, ids);
  const planOpt: InviteOption = {
    kind: 'planned',
    text: when ? `Perfect group window ${fmtTime(when)}` : 'Find our window',
    when: fmtTime(when),
    at: when,
    friction: 'medium',
    successProb: clamp01(0.55 + 0.35 * (1 - rallyBias)),
    score: planScore,
    rationale: [when ? 'shared timing window' : 'align calendars'],
    tags: ['group','planned']
  };

  return [nowOpt, planOpt].sort((a, b) => b.score - a.score).slice(0, input.limit ?? 2);
}

function majorityWindow(contexts: Record<string, SmartInviteContext>, ids: string[]): Date | undefined {
  const wins: Record<string, number> = {};
  for (const id of ids) {
    const w = contexts[id]?.prediction?.optimalTiming;
    if (!w) continue;
    const k = new Date(w).toISOString().slice(0,16); // minute bin
    wins[k] = (wins[k] ?? 0) + 1;
  }
  let bestKey: string | undefined, bestCount = 0;
  Object.entries(wins).forEach(([k, c]) => { if (c > bestCount) { bestCount = c; bestKey = k; }});
  return bestKey ? new Date(bestKey) : undefined;
}

/* --------------------------------- Usage ------------------------------------
import { generateInviteOptions, generateGroupInviteOptions } from '@/lib/social/inviteEngine'

// Single:
const options = generateInviteOptions({ tensor, context, limit: 4 })
// -> [{kind:'spontaneous', text:'Rally here now', score:0.86, ...}, …]

// Group:
const groupOptions = generateGroupInviteOptions({ ids, tensors, contexts })
-----------------------------------------------------------------------------*/