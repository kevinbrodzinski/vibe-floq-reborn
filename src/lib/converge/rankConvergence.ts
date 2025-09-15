// Simple haversine distance calculation
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  
  const aVal = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
  
  return R * c;
}

export type ConvergeInputs = {
  peer: {
    energy01?: number;
    direction?: "up" | "flat" | "down";
    lngLat?: { lng: number; lat: number };
    properties?: Record<string, any>;
  };
  anchor?: { lng: number; lat: number } | null;
};

export type RankedPoint = {
  id: string;
  name: string;
  lng: number;
  lat: number;
  category?: string;
  match: number;         // 0..1 composite score
  eta: { meMin: number; friendMin: number };
};

// Basic ETA model (walk as fallback)
const WALK_MPS = 1.4;
const etaMinutes = (m: number) => Math.max(1, m / WALK_MPS / 60);

type VenueCandidate = { 
  id: string; 
  name: string; 
  lat: number; 
  lng: number; 
  category?: string; 
  openNow?: boolean; 
  crowd?: number; 
};

function vibeCompatibility(peer: ConvergeInputs["peer"], v: VenueCandidate): number {
  const e = peer.energy01 ?? 0.5;
  // Simple priors – tune later based on usage data
  const table: Record<string, number> = {
    coffee: 0.6 + (e < 0.5 ? 0.2 : 0),
    bar: 0.6 + (e > 0.5 ? 0.2 : 0), 
    park: 0.5 + (e > 0.6 ? 0.2 : 0),
    restaurant: 0.55,
    gym: 0.4 + (e > 0.7 ? 0.25 : 0),
  };
  const base = v.category ? (table[v.category] ?? 0.5) : 0.5;
  const dir = peer.direction === "up" ? 0.05 : peer.direction === "down" ? -0.05 : 0;
  const openBonus = v.openNow ? 0.05 : -0.1;
  return Math.max(0, Math.min(1, base + dir + openBonus));
}

// Pull venues from window.floq (set by LayersRuntime)
function getNearbyVenues(): VenueCandidate[] {
  // @ts-ignore - Global state from LayersRuntime
  const list: any[] = (window?.floq?.nearbyVenues ?? []);
  return (Array.isArray(list) ? list : []).slice(0, 50).map(v => ({
    id: String(v.pid ?? v.id),
    name: v.name ?? "Venue",
    lat: Number(v.lat), 
    lng: Number(v.lng),
    category: v.category ?? undefined,
    openNow: v.open_now ?? v.openNow ?? true,
    crowd: v.crowd ?? 0.5
  })).filter(v => Number.isFinite(v.lat) && Number.isFinite(v.lng));
}

export async function rankConvergence(inputs: ConvergeInputs): Promise<RankedPoint[]> {
  // @ts-ignore - Global state from LayersRuntime  
  const me = (window as any)?.floq?.myLocation as { lng:number; lat:number } | undefined;
  const peerLL = inputs.peer.lngLat;
  if (!me || !peerLL) return [];

  const candidates = getNearbyVenues();
  const out: RankedPoint[] = candidates.map(v => {
    const dMe = haversineMeters(me, { lat: v.lat, lng: v.lng });
    const dFr = haversineMeters({ lat: peerLL.lat, lng: peerLL.lng }, { lat: v.lat, lng: v.lng });
    const eta = { meMin: etaMinutes(dMe), friendMin: etaMinutes(dFr) };

    // Composite score: vibe compatibility + time balance + openness + symmetry
    const comp =
      0.45 * vibeCompatibility(inputs.peer, v) +
      0.30 * (1 - Math.min(1, Math.max(eta.meMin, eta.friendMin) / 30)) +
      0.15 * (v.openNow ? 1 : 0) +
      0.10 * (1 - (Math.abs(eta.meMin - eta.friendMin) / 30));

    return { 
      id: v.id, 
      name: v.name, 
      lat: v.lat, 
      lng: v.lng, 
      category: v.category, 
      match: Math.max(0, Math.min(1, comp)), 
      eta 
    };
  });

  out.sort((a, b) => b.match - a.match);
  return out;
}