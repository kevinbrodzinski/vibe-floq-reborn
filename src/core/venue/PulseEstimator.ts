// Converts VenueIntelligence into a compact pulse used by coupling.
import type { VenuePulse } from '@/core/field/FieldCoupling';
import type { VenueIntelligence } from '@/types/venues';

export function estimateVenuePulse(v: VenueIntelligence | null | undefined): VenuePulse {
  const base = v?.vibeProfile?.energyLevel ?? 0.5;
  const rt = v?.realTimeMetrics;
  
  // Map VenueIntelligence realTimeMetrics to our pulse format
  const occupancy = rt?.currentOccupancy ?? 0.5;
  const sessionLength = rt?.averageSessionMinutes ?? 30;
  const energyTrend = rt?.energyTrend ?? 'stable';
  
  // Derive slope from energy trend
  const trendSlope = energyTrend === 'rising' ? 0.2 : energyTrend === 'declining' ? -0.2 : 0;
  
  // Combine base energy with occupancy
  const energy = Math.max(base, 0.6 * base + 0.4 * occupancy);
  const slope = clampRange(trendSlope, -1, 1);
  
  // Use session length as volatility proxy (shorter sessions = more volatile)
  const volatility = Math.min(1, Math.max(0.1, 1 - (sessionLength / 120))); // normalize around 2hr sessions

  return { energy: clamp01(energy), slope, volatility };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clampRange = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));