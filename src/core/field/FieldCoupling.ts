// Lightweight couplings between people, venues, and groups.
export type PersonState = {
  energy: number;    // 0..1
  slope: number;     // dE/dt (−1..1, small)
  momentum: number;  // EMA of slope (−1..1)
  friendsPresent?: number; // 0..1
};

export type GroupState = {
  energy: number;            // 0..1
  cohesion: number;          // 0..1
  fragmentationRisk: number; // 0..1
  size: number;
};

export type VenuePulse = {
  energy: number;    // 0..1
  slope: number;     // −1..1
  volatility: number;// 0..1
};

export function humanVenueCoupling(p: PersonState, v?: VenuePulse | null) {
  if (!v) return 0;
  const friends = Math.min(1, p.friendsPresent ?? 0);
  const effect = 0.35 * v.energy + 0.25 * (v.slope * 0.5 + 0.5) + 0.25 * friends + 0.15 * (1 - v.volatility);
  return clamp01(0.7 * effect + 0.3 * (p.momentum * 0.5 + 0.5));
}

export function humanGroupCoupling(p: PersonState, g?: GroupState | null) {
  if (!g) return 0;
  const stability = g.cohesion * (1 - g.fragmentationRisk);
  const sizeEdge = g.size <= 5 ? 1 : g.size <= 10 ? 0.85 : 0.7;
  return clamp01(0.55 * g.energy + 0.45 * stability * sizeEdge);
}

export function updatePersonEnergy(p: PersonState, v?: VenuePulse | null, g?: GroupState | null): PersonState {
  const dvVenue = humanVenueCoupling(p, v) - 0.5;
  const dvGroup = humanGroupCoupling(p, g) - 0.5;
  const dv = 0.6 * dvVenue + 0.4 * dvGroup;
  const slope = 0.8 * p.slope + 0.2 * dv;
  const energy = clamp01(p.energy + 0.5 * slope);
  const momentum = clampRange(0.7 * p.momentum + 0.3 * slope, -1, 1);
  return { ...p, energy, slope, momentum };
}

export function updateVenueEnergy(pulse: VenuePulse, arrivals01: number, overcrowd01: number): VenuePulse {
  const next = clamp01(pulse.energy + 0.3 * arrivals01 - 0.25 * overcrowd01);
  const slope = clampRange(next - pulse.energy, -1, 1);
  const vol = clamp01(0.8 * pulse.volatility + 0.2 * Math.abs(slope));
  return { energy: next, slope, volatility: vol };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clampRange = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));