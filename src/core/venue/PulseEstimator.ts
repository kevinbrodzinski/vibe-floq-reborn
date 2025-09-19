import type { VenueIntelligence } from '@/types/venues';

export type VenuePulse = {
  energy: number;   // 0..1
  slope: number;    // -1..1
  volatility: number; // recent var
  capacityRatio?: number; // crowd / capacity
};

export function estimateVenuePulse(v: VenueIntelligence): VenuePulse {
  const base = v.vibeProfile?.energyLevel ?? 0.5;
  const rt = v.realTimeMetrics;
  
  // Use available metrics from the actual VenueIntelligence type
  const occupancy = rt?.currentOccupancy ?? 0.5;
  const sessionLength = rt?.averageSessionMinutes ?? 30;
  const energyTrend = rt?.energyTrend ?? 'stable';
  
  // Derive slope from energy trend
  const trendSlope = energyTrend === 'rising' ? 0.2 : energyTrend === 'declining' ? -0.2 : 0;
  
  // Combine base energy with occupancy
  const energy = Math.max(base, 0.6 * base + 0.4 * occupancy);
  const slope = trendSlope;
  
  // Use session length as volatility proxy (shorter sessions = more volatile)
  const volatility = Math.min(1, Math.max(0.1, 1 - (sessionLength / 120))); // normalize around 2hr sessions

  return { energy, slope, volatility, capacityRatio: occupancy };
}