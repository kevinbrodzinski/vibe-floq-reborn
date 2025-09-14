import type { Vibe } from '@/lib/vibes';
import type { SocialContext, SocialContextPatterns } from './store';
import { readSocial, writeSocial } from './service';

// Detect social context from friend presence data
export function detectSocialContext(nearbyFriends: number): SocialContext {
  if (nearbyFriends === 0) return 'alone';
  if (nearbyFriends === 1) return 'with-friend';
  if (nearbyFriends <= 4) return 'small-group';
  return 'large-group';
}

// Learn from social context correction
export async function learnSocialContextPattern(
  context: SocialContext,
  correctedVibe: Vibe,
  sessionDurationMin: number,
  energyDelta: number
): Promise<void> {
  try {
    await learnSocialOutcome(context, correctedVibe, energyDelta, sessionDurationMin);
  } catch (error) {
    console.warn('Failed to learn social context pattern:', error);
  }
}

// buckets
export const bucketForNearby = (n?: number): SocialContext =>
  !n || n<=0 ? 'alone' : n===1 ? 'with-friend' : n<=4 ? 'small-group' : 'large-group';

/** Learn outcome */
export async function learnSocialOutcome(
  ctx: SocialContext,
  vibe: Vibe,
  energyDelta: number,
  minutes = 30
) {
  const rec = await readSocial();
  const row = rec.data[ctx];
  row.sampleN += 1;
  row.energyBoost = Number(((row.energyBoost * (row.sampleN - 1) + energyDelta) / row.sampleN).toFixed(3));
  row.avgSessionMin = Number(((row.avgSessionMin * (row.sampleN - 1) + minutes) / row.sampleN).toFixed(1));
  row.preferredVibes[vibe] = (row.preferredVibes[vibe] ?? 0) + 1;
  // normalize small dist
  const sum = Object.values(row.preferredVibes).reduce((s,n)=> s + (n ?? 0), 0) || 1;
  Object.keys(row.preferredVibes).forEach(k=>{
    row.preferredVibes[k as Vibe] = Number(((row.preferredVibes[k as Vibe] ?? 0)/sum).toFixed(3));
  });
  await writeSocial(rec);
}

/** Insights */
export async function getSocialContextInsights(): Promise<{
  mostSocial: SocialContext;
  leastSocial: SocialContext;
  energyBoostRanking: Array<{ context: SocialContext; boost: number; confidence: number }>;
  vibePreferences: Record<SocialContext, Array<{ vibe: Vibe; weight: number }>>;
}> {
  const rec = await readSocial();
  const patterns: SocialContextPatterns = rec.data;

  const entries = (Object.entries(patterns) as [SocialContext, SocialContextPatterns[SocialContext]][])
    .filter(([,d]) => d.sampleN >= 3);

  const energyBoostRanking = entries
    .map(([ctx, d]) => ({ context: ctx, boost: d.energyBoost, confidence: Math.min(1, d.sampleN/10) }))
    .sort((a,b)=> b.boost - a.boost);

  const mostSocial = energyBoostRanking[0]?.context ?? 'with-friend';
  const leastSocial = energyBoostRanking[energyBoostRanking.length-1]?.context ?? 'alone';

  const vibePreferences = {} as Record<SocialContext, Array<{vibe: Vibe; weight: number}>>;
  (Object.entries(patterns) as [SocialContext, SocialContextPatterns[SocialContext]][]).forEach(([ctx,d])=>{
    const top = Object.entries(d.preferredVibes)
      .sort(([,a],[,b])=> (b ?? 0) - (a ?? 0))
      .slice(0,3)
      .map(([v,w]) => ({ vibe: v as Vibe, weight: (w ?? 0) }));
    vibePreferences[ctx] = top;
  });

  return { mostSocial, leastSocial, energyBoostRanking, vibePreferences };
}

/** Prediction from social context (guarded) */
export async function predictOptimalVibe(context: SocialContext): Promise<{ vibe: Vibe; confidence: number } | null> {
  const rec = await readSocial();
  const row = rec.data[context];
  if (!row || row.sampleN < 3) return null;
  const [topVibe, w] = Object.entries(row.preferredVibes).sort(([,a],[,b])=> (b ?? 0)-(a ?? 0))[0] ?? [];
  if (!topVibe || (w ?? 0) < 0.3) return null;
  const sampleC = Math.min(1, row.sampleN/15);
  const conf = (w ?? 0) * sampleC;
  return conf > 0.5 ? { vibe: topVibe as Vibe, confidence: conf } : null;
}