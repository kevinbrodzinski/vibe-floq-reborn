// Lightweight, linear projection convergence calculation (m/s space)
// Works with Phase-1 useSocialCache velocity outputs.
export type Agent = {
  id: string
  // meters/second east (vx), north (vy)
  vx: number
  vy: number
  // current position in degrees
  lng: number
  lat: number
  // confidence 0..1
  conf: number
}

export type ConvergenceCandidate = {
  id: string
  participants: string[]
  probability: number        // 0..1
  timeToMeet: number         // seconds
  meetingPoint: { lng: number; lat: number; venueName?: string }
  type: 'pair' | 'group'
  confidence: number
}

const METERS_PER_DEG_LAT = 110540;
const metersPerDegLng = (lat: number) => 111320 * Math.cos(lat * Math.PI / 180);

// Project an agent's position (deg) forward by t seconds using m/s velocity
export function project(agent: Agent, tSec: number) {
  if (tSec === 0) return { lng: agent.lng, lat: agent.lat }
  const mLng = metersPerDegLng(agent.lat);
  const dLngDeg = (agent.vx * tSec) / mLng;
  const dLatDeg = (agent.vy * tSec) / METERS_PER_DEG_LAT;
  return { lng: agent.lng + dLngDeg, lat: agent.lat + dLatDeg }
}

// Haversine (m)
export function haversine(a: {lat:number;lng:number}, b:{lat:number;lng:number}) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI/180;
  const dLng = (b.lng - a.lng) * Math.PI/180;
  const s1 = Math.sin(dLat/2)**2;
  const s2 = Math.sin(dLng/2)**2 * Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180);
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

// Venue magnetism stub – boost probability near likely venues
export type VenueMagnetism = (p:{lng:number;lat:number}) => number; // 0.7..1.3 typical
export const neutralMagnetism: VenueMagnetism = () => 1.0;

// Compute best pair convergence within horizon (seconds)
export function bestPairConvergence(
  a: Agent, b: Agent,
  horizonSec = 180,
  approachMinSpeed = 0.1, // m/s of relative speed
  meetMaxDistM = 50,
  magnetism: VenueMagnetism = neutralMagnetism
): ConvergenceCandidate | null {
  // relative in m/s along east (x), north (y)
  const vRx = b.vx - a.vx;
  const vRy = b.vy - a.vy;
  const relSpeed = Math.hypot(vRx, vRy);
  if (relSpeed < approachMinSpeed) return null;

  // evaluate along samples (discrete) – cheap & robust
  const samples = 9; // 0..horizon
  let best: {t:number; dist:number; p:{lng:number;lat:number}} | null = null;
  for (let s=1; s<=samples; s++) {
    const t = (horizonSec * s) / samples;
    const pa = project(a, t);
    const pb = project(b, t);
    const d = haversine(pa, pb);
    if (!best || d < best.dist) best = { t, dist: d, p: { lng: (pa.lng+pb.lng)/2, lat:(pa.lat+pb.lat)/2 } };
  }
  if (!best || best.dist > meetMaxDistM) return null;

  // probability = conf × time decay × venue magnetism
  const baseConf = Math.min(a.conf, b.conf);
  const timeFactor = Math.exp(-best.t / 120); // 2-min decay
  const mag = magnetism(best.p);
  const prob = Math.max(0, Math.min(1, baseConf * timeFactor * mag));
  if (prob < 0.5) return null; // conservative

  return {
    id: `pair:${a.id}:${b.id}`,
    participants: [a.id, b.id],
    probability: prob,
    timeToMeet: best.t,
    meetingPoint: best.p,
    type: 'pair',
    confidence: baseConf
  };
}

// Simple group convergence: if top pairs share a close meeting point/time
export function groupConvergences(
  agents: Agent[],
  magnetism: VenueMagnetism = neutralMagnetism
): ConvergenceCandidate[] {
  const pairs: ConvergenceCandidate[] = [];
  for (let i=0;i<agents.length;i++) {
    for (let j=i+1;j<agents.length;j++) {
      const c = bestPairConvergence(agents[i], agents[j], 180, 0.1, 50, magnetism);
      if (c) pairs.push(c);
    }
  }
  if (pairs.length < 3) return [];
  // cluster: pick densest by time+space
  const out: ConvergenceCandidate[] = [];
  pairs.forEach(p => {
    const cluster = pairs.filter(q =>
      Math.abs(q.timeToMeet - p.timeToMeet) < 30 &&
      haversine(q.meetingPoint, p.meetingPoint) < 30
    );
    const uniqueIds = new Set<string>();
    cluster.forEach(c => c.participants.forEach(id => uniqueIds.add(id)));
    if (uniqueIds.size >= 3) {
      const prob = Math.min(1, cluster.reduce((s,c)=>s+c.probability,0)/cluster.length * 1.1);
      out.push({
        id: `group:${Array.from(uniqueIds).sort().join(',')}`,
        participants: Array.from(uniqueIds),
        probability: prob,
        timeToMeet: cluster.reduce((s,c)=>s+c.timeToMeet,0)/cluster.length,
        meetingPoint: {
          lng: cluster.reduce((s,c)=>s+c.meetingPoint.lng,0)/cluster.length,
          lat: cluster.reduce((s,c)=>s+c.meetingPoint.lat,0)/cluster.length
        },
        type: 'group',
        confidence: Math.min(...cluster.map(c=>c.confidence))
      })
    }
  });
  // dedupe by id
  const seen = new Set<string>();
  return out.filter(e => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}