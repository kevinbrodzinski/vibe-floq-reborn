import type { EngineInputs, VibeReading, ComponentScores } from './types';
import { combine, confidence } from './MasterEquation';
import { VIBES } from '@/lib/vibes';
import type { VenueIntelligence } from '@/types/venues';

// helpers
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function circadianScore(hour: number, isWeekend: boolean) {
  if (hour >= 17 && hour <= 22) return 0.8;
  if (!isWeekend && hour >= 9 && hour <= 12) return 0.6;
  if (hour < 6) return 0.2;
  return 0.5;
}
const movementScore = (speed?: number) => clamp01((speed ?? 0) / 2);

function weatherScore(isDaylight?: boolean, offset?: number) {
  const base = isDaylight ? 0.4 : 0.1;
  return clamp01(base + (offset ?? 0));
}

// ENHANCED: venue intelligence + contextual scoring
function venueEnergyScore(
  base?: number | null, 
  dwellMin?: number, 
  arrived?: boolean, 
  venueIntelligence?: VenueIntelligence | null
) {
  let score = base ?? 0.5;
  
  // Arrival bump
  if (arrived) score += 0.05;
  
  // Dwell time influence
  if (dwellMin != null) {
    if (dwellMin > 20) score += 0.2;
    else if (dwellMin > 5) score += 0.1;
  }
  
  // Enhanced venue intelligence integration
  if (venueIntelligence) {
    const { vibeProfile, realTimeMetrics, placeData } = venueIntelligence;
    
    // Base venue energy from intelligence
    score = Math.max(score, vibeProfile.energyLevel * 0.7); // Don't override too aggressively
    
    // Real-time occupancy influence
    const occupancyBoost = realTimeMetrics.currentOccupancy * 0.15;
    score += occupancyBoost;
    
    // Open status boost
    if (placeData.isOpen) {
      score += 0.08;
    }
    
    // High-rated venue boost
    if (placeData.rating && placeData.rating > 4.0 && placeData.totalRatings && placeData.totalRatings > 50) {
      score += 0.05;
    }
    
    // Time-of-day alignment
    const hour = new Date().getHours();
    const timeKey = hour < 6 ? 'night' : 
                   hour < 12 ? 'morning' : 
                   hour < 17 ? 'afternoon' : 
                   hour < 22 ? 'evening' : 'night';
    
    const timeAlignment = vibeProfile.timeOfDayPreferences[timeKey];
    score *= (0.7 + (timeAlignment * 0.3)); // Adjust by time preference
  }
  
  return clamp01(score);
}
const deviceUsageScore = (ratio?: number) => (ratio == null ? 0.3 : clamp01(0.2 + 0.8 * ratio));

export function evaluate(inp: EngineInputs): VibeReading {
  const t0 = performance.now();
  const components: ComponentScores = {
    circadian:   circadianScore(inp.hour, inp.isWeekend),
    movement:    movementScore(inp.speedMps),
    venueEnergy: venueEnergyScore(inp.venueEnergyBase, inp.dwellMinutes, inp.venueArrived, inp.venueIntelligence),
    deviceUsage: deviceUsageScore(inp.screenOnRatio01),
    weather:     weatherScore(inp.isDaylight, inp.weatherEnergyOffset),
  };

  const vector = combine(components);
  let best = VIBES.reduce((a, b) => (vector[b] > vector[a] ? b : a), VIBES[0]);
  let conf = confidence(components);
  
  // Enhanced venue-vibe alignment
  if (inp.venueIntelligence) {
    const { vibeProfile } = inp.venueIntelligence;
    
    // If venue has strong vibe preference and we're close, boost that vibe
    if (vibeProfile.confidence > 0.7) {
      const venueVibeScore = vector[vibeProfile.primaryVibe] || 0;
      const currentBestScore = vector[best] || 0;
      
      // If venue's primary vibe is close to current best, and venue is confident, prefer it
      if (venueVibeScore > currentBestScore * 0.8) {
        vector[vibeProfile.primaryVibe] = Math.max(venueVibeScore, currentBestScore * 1.1);
        best = vibeProfile.primaryVibe;
        conf = Math.min(0.95, conf + (vibeProfile.confidence * 0.1));
      }
    }
  }
  
  // Tiny bonus for stable weather (Clear/Clouds)
  if (inp.weatherConfidenceBoost) {
    conf = Math.min(0.95, conf + inp.weatherConfidenceBoost);
  }

  return {
    timestamp: Date.now(),
    vibe: best,
    confidence01: conf,
    components,
    vector,
    calcMs: Math.max(0, performance.now() - t0),
    venueIntelligence: inp.venueIntelligence, // Include venue context in output
  };
}