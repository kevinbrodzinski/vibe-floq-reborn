import { ConvergeInputs, RankedPoint, VenueCandidate } from '@/types/presence';
import { haversineMeters } from '@/lib/geo/haversine';

const WALK_MPS = 1.4;
const etaMinutes = (meters: number) => Math.max(1, meters / WALK_MPS / 60);

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function vibeCompatibility(peer: ConvergeInputs['peer'], v: VenueCandidate): number {
  const e = peer.energy01 ?? 0.5;
  const table: Record<string, number> = {
    coffee: 0.6 + (e < 0.5 ? 0.2 : 0),
    bar: 0.6 + (e > 0.5 ? 0.2 : 0),
    park: 0.5 + (e > 0.6 ? 0.2 : 0),
    restaurant: 0.55,
    gym: 0.4 + (e > 0.7 ? 0.25 : 0),
  };
  const base = v.category ? (table[v.category] ?? 0.5) : 0.5;
  const dir = peer.direction === 'up' ? 0.05 : peer.direction === 'down' ? -0.05 : 0;
  // unknown => neutral, true => +, false => -
  const openBonus = v.openNow === true ? 0.05 : v.openNow === false ? -0.1 : 0;
  return clamp01(base + dir + openBonus);
}

function getNearbyVenues(): VenueCandidate[] {
  const list = window?.floq?.nearbyVenues ?? [];
  return (Array.isArray(list) ? list : [])
    .slice(0, 50)
    .map(v => ({
      id: String(v.pid ?? v.id ?? ''),
      name: v.name ?? 'Venue',
      lat: Number(v.lat),
      lng: Number(v.lng),
      category: v.category ?? undefined,
      openNow: (v.open_now ?? v.openNow) ?? undefined,
      crowd: typeof v.crowd === 'number' ? v.crowd : undefined,
    }))
    .filter(v => v.id && Number.isFinite(v.lat) && Number.isFinite(v.lng));
}

export async function rankConvergence(inputs: ConvergeInputs): Promise<RankedPoint[]> {
  const me = window?.floq?.myLocation;
  const peerLL = inputs.peer.lngLat;
  if (!me || !peerLL) return [];

  const candidates = getNearbyVenues();
  const out: RankedPoint[] = candidates.map(v => {
    const dMe = haversineMeters(me, { lat: v.lat, lng: v.lng });
    const dFr = haversineMeters(peerLL, { lat: v.lat, lng: v.lng });
    const eta = { meMin: etaMinutes(dMe), friendMin: etaMinutes(dFr) };

    const comp =
      0.45 * vibeCompatibility(inputs.peer, v) +
      0.30 * (1 - Math.min(1, Math.max(eta.meMin, eta.friendMin) / 30)) +
      0.15 * (v.openNow === true ? 1 : 0) +
      0.10 * (1 - Math.min(1, Math.abs(eta.meMin - eta.friendMin) / 30));

    return {
      id: v.id,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      category: v.category,
      match: clamp01(comp),
      eta
    };
  });

  // Sort by match, then by total ETA
  out.sort((a, b) => b.match - a.match || (a.eta.meMin + a.eta.friendMin) - (b.eta.meMin + b.eta.friendMin));
  return out;
}

// Exported so we can pre-insert a friend's current venue with the same math
export function scoreCandidate(
  peer: ConvergeInputs['peer'],
  v: VenueCandidate,
  me: { lat: number; lng: number },
  peerLL: { lat: number; lng: number }
): RankedPoint {
  const dMe = haversineMeters(me, { lat: v.lat, lng: v.lng });
  const dFr = haversineMeters(peerLL, { lat: v.lat, lng: v.lng });
  const eta = { meMin: etaMinutes(dMe), friendMin: etaMinutes(dFr) };
  const comp =
    0.45 * vibeCompatibility(peer, v) +
    0.30 * (1 - Math.min(1, Math.max(eta.meMin, eta.friendMin) / 30)) +
    0.15 * (v.openNow ? 1 : 0) +
    0.10 * (1 - Math.min(1, Math.abs(eta.meMin - eta.friendMin) / 30));
  return {
    id: v.id,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    category: v.category,
    match: clamp01(comp),
    eta
  };
}