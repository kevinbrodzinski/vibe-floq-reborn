export type EnergySample = { t: number | Date | string; energy: number };
export type PathPoint = { lng: number; lat: number; t?: number | Date | string };

const toMs = (v: number | Date | string) =>
  typeof v === 'number' ? v : (v instanceof Date ? v.getTime() : Date.parse(v));

export function computeMomentum(samples: EnergySample[], windowN = 3): { dir: -1 | 0 | 1; mag: number } {
  if ((samples?.length ?? 0) < windowN + 1) return { dir: 0, mag: 0 };
  
  // Smooth then calculate slope
  const smoothed: number[] = samples.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowN / 2));
    const end = Math.min(samples.length - 1, i + Math.floor(windowN / 2));
    let sum = 0;
    for (let j = start; j <= end; j++) {
      sum += samples[j].energy;
    }
    return sum / (end - start + 1);
  });
  
  const dy = smoothed[smoothed.length - 1] - smoothed[smoothed.length - 1 - windowN];
  const dir = dy > 0.03 ? 1 : dy < -0.03 ? -1 : 0;
  const mag = Math.min(1, Math.abs(dy) * 3); // Scale to 0..1
  
  return { dir: dir as -1 | 0 | 1, mag };
}

/**
 * Cohesion: how much of my recent path coexists (time+space) with friends' heads.
 * Light heuristic: count friend heads falling within D meters & T minutes of
 * N recent path points; return normalized cohesion 0..1 and nearby count.
 */
export function computeCohesion(args: {
  myPath: PathPoint[];
  friendHeads: Array<{ lng: number; lat: number; t_head: string }>;
  distM?: number;
  timeMin?: number;
}) {
  const { myPath, friendHeads, distM = 150, timeMin = 12 } = args;
  if (!myPath?.length || !friendHeads?.length) return { cohesion: 0, nearby: 0 };

  // Haversine distance calculation
  const toRad = (x: number) => x * Math.PI / 180;
  const distanceMeters = (a: PathPoint, b: { lng: number; lat: number }) => {
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2));
    return R * c;
  };

  const heads = friendHeads.map(h => ({ 
    lng: h.lng, 
    lat: h.lat, 
    t: toMs(h.t_head) 
  }));
  
  const recent = myPath.slice(-Math.min(myPath.length, 24)); // Last ~N points
  const horizonMs = timeMin * 60000;
  let hits = 0;
  let checks = 0;

  for (const point of recent) {
    const pointTime = point.t ? toMs(point.t) : null;
    
    for (const head of heads) {
      // Skip if outside time window
      if (pointTime && Math.abs(head.t - pointTime) > horizonMs) continue;
      
      // Check spatial proximity
      if (distanceMeters(point, head) <= distM) {
        hits++;
        break; // Count each path point max once
      }
    }
    checks++;
  }
  
  const cohesion = checks ? Math.min(1, hits / checks) : 0;
  return { cohesion, nearby: hits };
}