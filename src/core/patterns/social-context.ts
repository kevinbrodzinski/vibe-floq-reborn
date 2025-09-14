// Social context pattern learning (alone vs with friends)
import type { Vibe } from '@/lib/vibes';
import type { SocialContext, SocialContextPatterns } from './store';
import { storage } from '@/lib/storage';
import { STORAGE_KEYS, EMPTY_SOCIAL_CONTEXT } from './store';
import { ewma, normalizeVibeDistribution } from './evolve';

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
    const patterns = await readSocialContext();
    const existing = patterns.data[context];
    
    // Update with EWMA learning
    const updated = {
      sampleN: existing.sampleN + 1,
      energyBoost: ewma(existing.energyBoost, energyDelta, 0.08),
      avgSessionMin: ewma(existing.avgSessionMin, sessionDurationMin, 0.08),
      preferredVibes: { ...existing.preferredVibes }
    };
    
    // Update vibe preference
    updated.preferredVibes[correctedVibe] = ewma(
      updated.preferredVibes[correctedVibe] || 0, 
      1, 
      0.08
    );
    
    // Normalize vibe distribution
    updated.preferredVibes = normalizeVibeDistribution(updated.preferredVibes);
    
    patterns.data[context] = updated;
    await writeSocialContext(patterns);
    
    if (import.meta.env.DEV) {
      console.log(`[Patterns] Updated social context ${context}:`, {
        sampleN: updated.sampleN,
        energyBoost: updated.energyBoost.toFixed(3),
        correctedVibe
      });
    }
  } catch (error) {
    console.warn('Failed to learn social context pattern:', error);
  }
}

// Get social context insights
export async function getSocialContextInsights(): Promise<{
  mostSocial: SocialContext;
  leastSocial: SocialContext;
  energyBoostRanking: Array<{ context: SocialContext; boost: number; confidence: number }>;
  vibePreferences: Record<SocialContext, Array<{ vibe: Vibe; weight: number }>>;
}> {
  try {
    const patterns = await readSocialContext();
    
    // Find most and least social contexts with enough data
    const validContexts = Object.entries(patterns.data).filter(([, data]) => (data as any).sampleN >= 3);
    
    const energyRanking = validContexts
      .map(([context, data]) => ({
        context: context as SocialContext,
        boost: (data as any).energyBoost,
        confidence: Math.min(1, (data as any).sampleN / 10)
      }))
      .sort((a, b) => b.boost - a.boost);
    
    const mostSocial = energyRanking[0]?.context || 'with-friend';
    const leastSocial = energyRanking[energyRanking.length - 1]?.context || 'alone';
    
    // Extract vibe preferences for each context
    const vibePreferences: Record<SocialContext, Array<{ vibe: Vibe; weight: number }>> = {} as any;
    
    Object.entries(patterns.data).forEach(([context, data]) => {
      const contextData = data as any;
      const sortedVibes = Object.entries(contextData.preferredVibes || {})
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([vibe, weight]) => ({ vibe: vibe as Vibe, weight: weight as number }));
      
      vibePreferences[context as SocialContext] = sortedVibes;
    });
    
    return {
      mostSocial,
      leastSocial,
      energyBoostRanking: energyRanking,
      vibePreferences
    };
  } catch (error) {
    console.warn('Failed to get social context insights:', error);
    return {
      mostSocial: 'with-friend',
      leastSocial: 'alone', 
      energyBoostRanking: [],
      vibePreferences: {} as any
    };
  }
}

// Predict optimal vibe for social context
export async function predictOptimalVibe(
  context: SocialContext,
  hourOfDay: number
): Promise<{ vibe: Vibe; confidence: number } | null> {
  try {
    const patterns = await readSocialContext();
    const contextData = patterns.data[context];
    
    if (!contextData || contextData.sampleN < 3) return null;
    
    const topVibes = Object.entries(contextData.preferredVibes)
      .sort(([, a], [, b]) => (b || 0) - (a || 0))
      .slice(0, 2);
    
    if (topVibes.length === 0 || !topVibes[0][1] || topVibes[0][1] < 0.3) return null;
    
    const vibe = topVibes[0][0] as Vibe;
    const baseConfidence = topVibes[0][1];
    
    // Adjust confidence based on sample size and time consistency
    const sampleConfidence = Math.min(1, contextData.sampleN / 15);
    const finalConfidence = baseConfidence * sampleConfidence;
    
    return finalConfidence > 0.5 ? { vibe, confidence: finalConfidence } : null;
  } catch (error) {
    console.warn('Failed to predict optimal vibe:', error);
    return null;
  }
}

// Get social amplification effect
export async function getSocialAmplification(): Promise<{
  soloEnergyBaseline: number;
  groupEnergyBoost: number;
  amplificationFactor: number;
}> {
  try {
    const patterns = await readSocialContext();
    
    const aloneData = patterns.data.alone;
    const groupData = [
      patterns.data['with-friend'],
      patterns.data['small-group'], 
      patterns.data['large-group']
    ].filter(d => d.sampleN >= 3);
    
    if (aloneData.sampleN < 3 || groupData.length === 0) {
      return { soloEnergyBaseline: 0, groupEnergyBoost: 0, amplificationFactor: 1 };
    }
    
    const avgGroupBoost = groupData.reduce((sum, d) => sum + d.energyBoost, 0) / groupData.length;
    const amplificationFactor = avgGroupBoost > 0 ? (avgGroupBoost / Math.abs(aloneData.energyBoost || 0.1)) : 1;
    
    return {
      soloEnergyBaseline: aloneData.energyBoost,
      groupEnergyBoost: avgGroupBoost,
      amplificationFactor: Math.max(1, amplificationFactor)
    };
  } catch (error) {
    console.warn('Failed to get social amplification:', error);
    return { soloEnergyBaseline: 0, groupEnergyBoost: 0, amplificationFactor: 1 };
  }
}

// Storage operations
async function readSocialContext() {
  try {
    const stored = await storage.getItem(STORAGE_KEYS.SOCIAL_CONTEXT);
    return stored ? JSON.parse(stored) : EMPTY_SOCIAL_CONTEXT;
  } catch {
    return EMPTY_SOCIAL_CONTEXT;
  }
}

async function writeSocialContext(patterns: typeof EMPTY_SOCIAL_CONTEXT) {
  try {
    patterns.updatedAt = Date.now();
    await storage.setJSON(STORAGE_KEYS.SOCIAL_CONTEXT, patterns);
  } catch (error) {
    console.warn('Failed to write social context patterns:', error);
  }
}

// Export for use in other pattern modules
export { readSocialContext, writeSocialContext };