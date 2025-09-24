// Enhanced pattern learning with multi-context integration
import type { Vibe } from '@/lib/vibes';
import type { SocialContext } from './store';
import { learnFromCorrection as baseLearnFromCorrection, type CorrectionContext } from './learner';
import { getOrCreateCluster, getClusterInsights } from './gps-clustering';
import { detectSocialContext, learnSocialContextPattern } from './social-context';
import { extractVenueTypeFromVI } from '@/core/venues/category-mapper';
import { incr } from './telemetry';

// Safe event emitter for React Native compatibility
const safeEmitLearningEvent = (detail: any) => {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('pattern-learning', { detail }));
    }
  } catch {
    // React Native: no-op
  }
};

// Enhanced correction context with social and GPS data
export interface EnhancedCorrectionContext extends CorrectionContext {
  lat?: number;
  lng?: number;
  nearbyFriends?: number;
  socialContext?: SocialContext;
  sessionDurationMin?: number;
}

// Confidence gates for pattern learning
export const PATTERN_CONFIDENCE_GATES = {
  MIN_SAMPLE_SIZE: 3,
  MIN_CONFIDENCE: 0.6,
  HIGH_CONFIDENCE: 0.8,
  VENUE_MIN_VISITS: 5,
  SOCIAL_MIN_SESSIONS: 3
} as const;

// Main entry point for enhanced pattern learning
export async function learnFromEnhancedCorrection(
  context: EnhancedCorrectionContext
): Promise<void> {
  // Always run base learning
  await baseLearnFromCorrection(context);
  
  // GPS-based venue clustering (only with sufficient confidence)
  if (context.lat && context.lng && !context.venueType && context.confidence >= PATTERN_CONFIDENCE_GATES.MIN_CONFIDENCE) {
    try {
      const cluster = await getOrCreateCluster(
        context.lat, 
        context.lng, 
        context.dwellMinutes || 0
      );
      
      if (cluster) {
        // Learn venue patterns from GPS cluster
        const insights = getClusterInsights(cluster);
        
        // Update cluster with learned vibe preference
        // This would be called through a separate cluster learning function
        if (import.meta.env.DEV) {
          console.log('[Patterns] GPS cluster learning:', {
            clusterId: cluster.id,
            isFrequentSpot: insights.isFrequentSpot,
            correctedVibe: context.corrected
          });
        }
        
        // Emit learning event for UI feedback
        safeEmitLearningEvent({
          type: 'gps',
          message: `Learned preference for ${insights.isFrequentSpot ? 'frequent spot' : 'new location'}`,
          confidence: insights.isFrequentSpot ? 0.8 : 0.6
        });
      }
    } catch (error) {
      console.warn('GPS cluster learning failed:', error);
    }
  }
  
  // Social context pattern learning (only with sufficient confidence)
  if (typeof context.nearbyFriends === 'number' && context.confidence >= PATTERN_CONFIDENCE_GATES.MIN_CONFIDENCE) {
    try {
      const socialContext = context.socialContext || detectSocialContext(context.nearbyFriends);
      const sessionDuration = context.sessionDurationMin || 30; // default session length
      
      // Calculate energy delta for social learning
      const energyDelta = calculateSocialEnergyDelta(context);
      
      await learnSocialContextPattern(
        socialContext,
        context.corrected,
        sessionDuration,
        energyDelta
      );
      
      if (import.meta.env.DEV) {
        console.log('[Patterns] Social context learning:', {
          socialContext,
          nearbyFriends: context.nearbyFriends,
          correctedVibe: context.corrected,
          energyDelta
        });
      }
      
      // Emit learning event for UI feedback
      safeEmitLearningEvent({
        type: 'social',
        message: `Learning ${socialContext} vibe preferences`,
        confidence: Math.min(0.9, 0.5 + (context.nearbyFriends || 0) * 0.1)
      });
    } catch (error) {
      console.warn('Social context learning failed:', error);
    }
  }
  
  // Sequence learning enhancement (future: learn from venue transitions)
  // This would integrate with existing sequence detection to learn outcomes
}

// Calculate energy delta specific to social context
function calculateSocialEnergyDelta(context: EnhancedCorrectionContext): number {
  // Social vibes (higher energy when with others)
  const socialVibes = new Set(['social', 'hype', 'flowing', 'open']);
  const soloVibes = new Set(['solo', 'chill', 'focused', 'romantic']);
  
  let energyDelta = 0;
  
  if (socialVibes.has(context.corrected)) {
    energyDelta += 0.3;
  } else if (soloVibes.has(context.corrected)) {
    energyDelta -= 0.3;
  }
  
  // Amplify based on group size
  const groupSize = context.nearbyFriends || 0;
  if (groupSize > 0 && socialVibes.has(context.corrected)) {
    energyDelta += Math.min(0.4, groupSize * 0.1);
  }
  
  return Math.max(-1, Math.min(1, energyDelta));
}

// Get enhanced prediction with multi-context awareness
export async function getPredictionWithContext(
  baseVibe: Vibe,
  context: {
    lat?: number;
    lng?: number;
    nearbyFriends?: number;
    hourOfDay: number;
    venueType?: string;
  }
): Promise<{
  suggestedVibe: Vibe;
  confidence: number;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let confidence = 0.5;
  let suggestedVibe = baseVibe;
  
  // GPS cluster insights
  if (context.lat && context.lng) {
    try {
      // This would check if we're at a known cluster with strong patterns
      // For now, just add placeholder logic
      reasons.push('Location patterns considered');
      confidence += 0.1;
    } catch (error) {
      // Silent fail for prediction enhancement
    }
  }
  
  // Social context prediction
  if (typeof context.nearbyFriends === 'number') {
    const socialContext = detectSocialContext(context.nearbyFriends);
    
    if (socialContext !== 'alone') {
      // Suggest more social vibes when with others
      const socialVibes: Vibe[] = ['social', 'hype', 'flowing', 'open'];
      if (socialVibes.includes(baseVibe)) {
        confidence += 0.15;
        reasons.push(`${socialContext} context supports social vibes`);
      } else {
        // Suggest alternative social vibe
        suggestedVibe = 'social';
        reasons.push(`Consider more social vibes when ${socialContext}`);
      }
    } else {
      // Solo context
      const soloVibes: Vibe[] = ['solo', 'chill', 'focused', 'romantic'];
      if (soloVibes.includes(baseVibe)) {
        confidence += 0.15;
        reasons.push('Solo context supports focused vibes');
      }
    }
  }
  
  return {
    suggestedVibe,
    confidence: Math.min(0.95, confidence),
    reasons
  };
}

// Initialize enhanced learning system
export function initializeEnhancedLearning(): void {
  // This would set up listeners for social context changes, GPS updates, etc.
  if (import.meta.env.DEV) {
    console.log('[Patterns] Enhanced learning system initialized');
  }
}