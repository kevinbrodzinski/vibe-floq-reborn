import type { EngineInputs, VibeReading, ComponentScores, Vibe } from './types';
import { combine, confidence } from './MasterEquation';
import { renormalizeVector } from './vectorUtils';
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

// ENHANCED: venue intelligence + contextual scoring (safer aggregation)
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
  
  // Enhanced venue intelligence integration (avoid double-counting base)
  if (venueIntelligence) {
    const { vibeProfile, realTimeMetrics, placeData } = venueIntelligence;
    
    // Use venue energy as floor, not replacement
    const floor = (vibeProfile.energyLevel ?? 0.5) * 0.7;
    score = Math.max(score, floor);
    
    // Real-time occupancy influence
    const occupancyBoost = (realTimeMetrics?.currentOccupancy ?? 0) * 0.15;
    score += occupancyBoost;
    
    // Open status boost/penalty
    if (placeData.isOpen === true) {
      score += 0.08;
    } else if (placeData.isOpen === false) {
      score -= 0.05; // Closed venues dampen energy
    }
    
    // High-rated venue boost
    const rating = placeData.rating;
    const totalRatings = placeData.totalRatings;
    if (rating && totalRatings && rating > 4.0 && totalRatings > 50) {
      score += 0.05;
    }
    
    // Time-of-day alignment (multiplier, not addition)
    const hour = new Date().getHours();
    const timeKey: keyof typeof vibeProfile.timeOfDayPreferences = 
      hour < 6 ? 'night' : 
      hour < 12 ? 'morning' : 
      hour < 17 ? 'afternoon' : 
      hour < 22 ? 'evening' : 'night';
    
    const timeAlignment = vibeProfile.timeOfDayPreferences[timeKey] ?? 0.5;
    score *= (0.7 + (timeAlignment * 0.3)); // Adjust by time preference
  }
  
  // Cap total venue contribution to prevent dominance
  return clamp01(Math.min(score, 0.5 + 0.35)); // Max +0.35 over baseline
}
const deviceUsageScore = (ratio?: number) => (ratio == null ? 0.3 : clamp01(0.2 + 0.8 * ratio));

export function evaluate(inp: EngineInputs): VibeReading {
  const t0 = performance.now();
  let components: ComponentScores = {
    circadian:   circadianScore(inp.hour, inp.isWeekend),
    movement:    movementScore(inp.speedMps),
    venueEnergy: venueEnergyScore(inp.venueEnergyBase, inp.dwellMinutes, inp.venueArrived, inp.venueIntelligence),
    deviceUsage: deviceUsageScore(inp.screenOnRatio01),
    weather:     weatherScore(inp.isDaylight, inp.weatherEnergyOffset),
  };

  // Pattern nudges (subtle ±0.1 max adjustments) - env gated
  if ((import.meta.env.VITE_VIBE_PATTERNS !== 'off') && inp.patterns?.hasEnoughData) {
    const { chronotype, energyType, socialType, temporalPrefs } = inp.patterns;
    const nudges: string[] = []; // Dev logging
    
    // Temporal confidence boost when chronotype aligns with hour
    if (chronotype === 'lark' && inp.hour >= 6 && inp.hour <= 11) {
      components.circadian = Math.min(1, components.circadian + 0.1);
      nudges.push(`chronotype-lark-boost(+0.1-circadian)`);
    } else if (chronotype === 'owl' && inp.hour >= 17 && inp.hour <= 22) {
      components.circadian = Math.min(1, components.circadian + 0.1);
      nudges.push(`chronotype-owl-boost(+0.1-circadian)`);
    }
    
    // Energy type nudges to movement component
    if (energyType === 'high-energy') {
      components.movement = Math.min(1, components.movement + 0.05);
      nudges.push(`energy-type-high(+0.05-movement)`);
    } else if (energyType === 'low-energy') {
      components.movement = Math.max(0, components.movement - 0.05);
      nudges.push(`energy-type-low(-0.05-movement)`);
    }
    
    // Social type nudges to venue energy (proxy for social context)
    if (socialType === 'social') {
      components.venueEnergy = Math.min(1, components.venueEnergy + 0.05);
      nudges.push(`social-type-social(+0.05-venue)`);
    } else if (socialType === 'solo') {
      components.venueEnergy = Math.max(0, components.venueEnergy - 0.05);
      nudges.push(`social-type-solo(-0.05-venue)`);
    }
    
    // Dev logging for component nudges
    if (import.meta.env.DEV && nudges.length > 0) {
      console.log(`🎯 Pattern nudges: ${nudges.join(', ')}`);
    }
  }

  const vector = combine(components);
  let best = VIBES.reduce((a, b) => (vector[b] > vector[a] ? b : a), VIBES[0]);
  let conf = confidence(components);
  
  // Enhanced venue-vibe alignment with vector normalization
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
        
        // Keep distribution valid - renormalize vector to maintain probability distribution
        renormalizeVector(vector);
      }
    }
  }
  
  // Pattern-enhanced vibe selection (env gated)
  if ((import.meta.env.VITE_VIBE_PATTERNS !== 'off') && inp.patterns?.hasEnoughData && inp.patterns.temporalPrefs) {
    const hourPrefs = inp.patterns.temporalPrefs[inp.hour];
    if (hourPrefs) {
      // Find strongest temporal preference for this hour
      const maxPref = Math.max(...Object.values(hourPrefs).filter(v => v != null) as number[]);
      if (maxPref > 0.3) { // Strong preference threshold
        const preferredVibe = Object.entries(hourPrefs).find(([_, v]) => v === maxPref)?.[0] as Vibe;
        if (preferredVibe && vector[preferredVibe]) {
          // Boost temporal preference if close to current best
          const currentBest = vector[best] || 0;
          const prefScore = vector[preferredVibe] || 0;
          if (prefScore > currentBest * 0.7) {
            vector[preferredVibe] = Math.max(prefScore, currentBest * 1.05);
            best = preferredVibe;
            conf = Math.min(0.95, conf + 0.05); // Temporal confidence boost
            
            // Dev logging for temporal preference nudge
            if (import.meta.env.DEV) {
              console.log(`🎯 Temporal preference nudge: ${preferredVibe} (strength: ${maxPref.toFixed(2)})`);
            }
            
            // Renormalize
            renormalizeVector(vector);
          }
        }
      }
    }
    
    // Consistency adjustments
    if (inp.patterns.consistency === 'very-consistent') {
      conf = Math.min(0.95, conf + 0.03); // Boost confidence for consistent users
    } else if (inp.patterns.consistency === 'highly-adaptive') {
      conf = Math.max(0.3, conf - 0.02); // Slight confidence reduction for highly adaptive users
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