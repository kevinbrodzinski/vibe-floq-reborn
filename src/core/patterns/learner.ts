// Pattern learning from user corrections and behavior
import type { Vibe } from '@/lib/vibes';
import type { ComponentScores } from '@/core/vibe/types';
import { 
  readVenueImpacts, 
  writeVenueImpacts,
  readTemporalPrefs,
  writeTemporalPrefs,
  readProfile,
  writeProfile,
  invalidatePatternCache
} from './service';
import { 
  evolveVenueImpact, 
  evolvePersonalityProfile,
  updateTemporalPreference,
  applyL2Decay
} from './evolve';
import { schedulePatternWork } from '@/utils/patternScheduler';

// Track learning rate limits to prevent overlearning
let lastVenueUpdate = 0;
let lastTemporalUpdate = 0;
let lastProfileUpdate = 0;

const MIN_UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between updates
const PROFILE_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours between profile updates

export interface CorrectionContext {
  predicted: Vibe;
  corrected: Vibe;
  componentScores: ComponentScores;
  confidence: number;
  timestamp: number;
  venueType?: string;
  venueId?: string;
  hourOfDay: number;
  dwellMinutes?: number;
}

// Learn from vibe correction (main learning entry point)
export async function learnFromCorrection(context: CorrectionContext): Promise<void> {
  const now = Date.now();
  
  // Schedule learning work in background to avoid blocking UI
  schedulePatternWork(() => {
    Promise.all([
      updateVenuePatterns(context, now),
      updateTemporalPatterns(context, now),
      updatePersonalityProfile(context, now)
    ]).catch(error => {
      console.warn('Pattern learning failed:', error);
    });
  });
}

// Update venue impact patterns
async function updateVenuePatterns(
  context: CorrectionContext, 
  now: number
): Promise<void> {
  if (!context.venueType || (now - lastVenueUpdate) < MIN_UPDATE_INTERVAL_MS) {
    return;
  }
  
  try {
    const venueStore = await readVenueImpacts();
    
    // Calculate energy delta from component scores
    const energyDelta = calculateEnergyDelta(context);
    
    // Evolve venue impact
    venueStore.data[context.venueType] = evolveVenueImpact(
      venueStore.data[context.venueType],
      {
        energyDelta,
        preferredVibe: context.corrected,
        dwellMin: context.dwellMinutes
      }
    );
    
    await writeVenueImpacts(venueStore);
    invalidatePatternCache();
    lastVenueUpdate = now;
    
    // Telemetry
    if (import.meta.env.DEV) {
      console.log(`[Patterns] Updated venue ${context.venueType}:`, {
        energyDelta: energyDelta.toFixed(3),
        preferredVibe: context.corrected,
        sampleCount: venueStore.data[context.venueType]?.sampleN
      });
    }
  } catch (error) {
    console.warn('Failed to update venue patterns:', error);
  }
}

// Update temporal preference patterns
async function updateTemporalPatterns(
  context: CorrectionContext,
  now: number
): Promise<void> {
  if ((now - lastTemporalUpdate) < MIN_UPDATE_INTERVAL_MS) {
    return;
  }
  
  try {
    const temporalStore = await readTemporalPrefs();
    const hourPrefs = temporalStore.data[context.hourOfDay] ?? {};
    
    // Update preference for this hour
    temporalStore.data[context.hourOfDay] = updateTemporalPreference(
      hourPrefs,
      context.corrected
    );
    
    await writeTemporalPrefs(temporalStore);
    invalidatePatternCache();
    lastTemporalUpdate = now;
    
    // Telemetry
    if (import.meta.env.DEV) {
      console.log(`[Patterns] Updated temporal hour ${context.hourOfDay}:`, {
        correctedVibe: context.corrected,
        newDistribution: temporalStore.data[context.hourOfDay]
      });
    }
  } catch (error) {
    console.warn('Failed to update temporal patterns:', error);
  }
}

// Update personality profile (less frequent, more stable)
async function updatePersonalityProfile(
  context: CorrectionContext,
  now: number
): Promise<void> {
  if ((now - lastProfileUpdate) < PROFILE_UPDATE_INTERVAL_MS) {
    return;
  }
  
  try {
    const profileStore = await readProfile();
    
    // Analyze correction to extract personality signals
    const personalityDelta = analyzePersonalityDelta(context);
    
    profileStore.data = evolvePersonalityProfile(
      profileStore.data,
      personalityDelta
    );
    
    await writeProfile(profileStore);
    invalidatePatternCache();
    lastProfileUpdate = now;
    
    // Telemetry
    if (import.meta.env.DEV) {
      console.log('[Patterns] Updated personality profile:', {
        energyPref: profileStore.data.energyPreference.toFixed(3),
        socialPref: profileStore.data.socialPreference.toFixed(3),
        chronotype: profileStore.data.chronotype,
        sampleCount: profileStore.data.sampleCount
      });
    }
  } catch (error) {
    console.warn('Failed to update personality profile:', error);
  }
}

// Calculate energy delta from component scores and correction
function calculateEnergyDelta(context: CorrectionContext): number {
  // High-energy vibes vs low-energy vibes
  const energyVibes: Partial<Record<Vibe, number>> = {
    hype: 1,
    flowing: 0.7,
    social: 0.6,
    open: 0.5,
    curious: 0.3,
    weird: 0.2,
    romantic: 0,
    chill: -0.3,
    solo: -0.5,
    down: -1
  };
  
  const predictedEnergy = energyVibes[context.predicted] ?? 0;
  const correctedEnergy = energyVibes[context.corrected] ?? 0;
  
  // Delta indicates if venue makes user more/less energetic than predicted
  return Math.max(-1, Math.min(1, correctedEnergy - predictedEnergy));
}

// Analyze correction for personality signals
function analyzePersonalityDelta(context: CorrectionContext) {
  const socialVibes = ['social', 'romantic', 'open'];
  const soloVibes = ['solo', 'chill', 'down'];
  const energyVibes = ['hype', 'flowing', 'social'];
  const calmVibes = ['chill', 'solo', 'romantic'];
  
  // Social preference signal
  let socialPref = 0;
  if (socialVibes.includes(context.corrected)) socialPref += 0.3;
  if (soloVibes.includes(context.corrected)) socialPref -= 0.3;
  
  // Energy preference signal  
  let energyPref = 0;
  if (energyVibes.includes(context.corrected)) energyPref += 0.3;
  if (calmVibes.includes(context.corrected)) energyPref -= 0.3;
  
  // Chronotype based on hour
  let chronotype: 'lark' | 'owl' | 'balanced' = 'balanced';
  if (context.hourOfDay < 8 && energyVibes.includes(context.corrected)) {
    chronotype = 'lark';
  } else if (context.hourOfDay > 22 && energyVibes.includes(context.corrected)) {
    chronotype = 'owl';
  }
  
  // Consistency based on correction magnitude
  const consistency01 = 1 - Math.abs(context.confidence - 0.7); // Higher when correction aligns with moderate confidence
  
  return {
    energyPref,
    socialPref,
    chronotype,
    consistency01: Math.max(0, Math.min(1, consistency01))
  };
}

// Periodic maintenance (call on app start or weekly)
export async function performPatternMaintenance(): Promise<void> {
  schedulePatternWork(async () => {
    try {
      // Apply decay to all patterns to prevent overfitting
      const [venueStore, temporalStore] = await Promise.all([
        readVenueImpacts(),
        readTemporalPrefs()
      ]);
      
      // Decay venue impacts
      venueStore.data = applyL2Decay(venueStore.data, 0.995);
      
      // Decay temporal preferences  
      Object.keys(temporalStore.data).forEach(hour => {
        temporalStore.data[parseInt(hour)] = applyL2Decay(
          temporalStore.data[parseInt(hour)], 
          0.998
        );
      });
      
      await Promise.all([
        writeVenueImpacts(venueStore),
        writeTemporalPrefs(temporalStore)
      ]);
      
      invalidatePatternCache();
      
      if (import.meta.env.DEV) {
        console.log('[Patterns] Maintenance complete - applied L2 decay');
      }
    } catch (error) {
      console.warn('Pattern maintenance failed:', error);
    }
  });
}

// Initialize pattern system
export function initializePatternLearning(): void {
  // Perform maintenance on startup
  performPatternMaintenance();
  
  // Schedule weekly maintenance
  if (typeof window !== 'undefined') {
    setInterval(() => {
      performPatternMaintenance();
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }
}