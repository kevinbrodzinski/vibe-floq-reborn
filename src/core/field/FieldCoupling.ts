// Lightweight couplings between people, venues, and groups.
import type { Vibe } from '@/lib/vibes';
import type { VenueIntelligence } from '@/types/venues';

export type PersonState = {
  energy: number;      // 0..1
  slope: number;       // dE/dt
  momentum: number;    // recent integrated slope
  vibe: Vibe;
  friendsPresent?: number; // 0..1 share
};

export type GroupState = {
  energy: number;           // 0..1
  cohesion: number;         // 0..1 (pairwise compat / variance)
  fragmentationRisk: number;// 0..1
  size: number;
};

export function humanVenueCoupling(p: PersonState, v?: VenueIntelligence): number {
  if (!v) return 0;
  // Derive compatibility from vibe profile match with person vibe
  const vibeMatch = v.vibeProfile?.primaryVibe === p.vibe ? 1 : 
                   v.vibeProfile?.secondaryVibe === p.vibe ? 0.7 : 0.3;
  const compat = (v.vibeProfile?.confidence ?? 0.5) * vibeMatch;
  const friends = Math.min(1, p.friendsPresent ?? 0);
  const venueEnergy = v.vibeProfile?.energyLevel ?? 0.5;
  // floor on venue effect so quiet rooms still nudge if compatible
  const effect = 0.35 * venueEnergy + 0.4 * compat + 0.25 * friends;
  // soften via momentum so we don't whipsaw
  return 0.7 * effect + 0.3 * clamp01(p.momentum);
}

export function humanGroupCoupling(p: PersonState, g?: GroupState): number {
  if (!g) return 0;
  const stability = g.cohesion * (1 - g.fragmentationRisk);
  const sizeEdge = g.size <= 5 ? 1 : g.size <= 10 ? 0.8 : 0.6;
  return 0.5 * g.energy + 0.5 * stability * sizeEdge;
}

export function updatePersonEnergy(p: PersonState, v?: VenueIntelligence, g?: GroupState): PersonState {
  const dvVenue = humanVenueCoupling(p, v) - 0.5;     // centered
  const dvGroup = humanGroupCoupling(p, g) - 0.5;
  const dv = 0.6 * dvVenue + 0.4 * dvGroup;
  const slope = 0.8 * p.slope + 0.2 * dv;
  const energy = clamp01(p.energy + 0.5 * slope);
  const momentum = clamp01(0.7 * p.momentum + 0.3 * slope);
  return { ...p, energy, slope, momentum };
}

export function updateVenueEnergy(pulse: number, arrivals: number, overcrowd: number): { energy: number; slope: number } {
  // arrivals boost, overcrowd dampens; keep numerically stable
  const next = clamp01(pulse + 0.3 * arrivals - 0.25 * overcrowd);
  const slope = next - pulse;
  return { energy: next, slope };
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
