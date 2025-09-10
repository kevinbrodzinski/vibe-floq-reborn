export type NearbyVenue = {
  id: string
  loc: { lng: number; lat: number }
  radius_m?: number | null
}

const R = 6371000; // m
const toRad = (x:number)=>x*Math.PI/180
function haversineM(a:{lng:number;lat:number}, b:{lng:number;lat:number}) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng)
  const s1 = Math.sin(dLat/2)**2, s2 = Math.sin(dLng/2)**2
  const c  = 2*Math.asin(Math.sqrt(s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2))
  return R*c
}

/** return nearest venue and distance (m) */
export function findNearestVenue(
  venues: NearbyVenue[],
  point: { lng:number; lat:number }
): { venue?: NearbyVenue; distanceM?: number } {
  let best: NearbyVenue | undefined; let bestD = Infinity
  for (const v of venues) {
    if (!v?.loc) continue
    const d = haversineM(point, v.loc)
    if (d < bestD) { bestD = d; best = v }
  }
  return { venue: best, distanceM: Number.isFinite(bestD) ? bestD : undefined }
}

/** true if point is inside venue's effective radius (falls back to 100m) */
export function isInsideVenue(
  venue: NearbyVenue, point: { lng:number; lat:number }, fallbackRadius = 100
): boolean {
  const r = Math.max(10, venue.radius_m ?? fallbackRadius)
  const d = haversineM(point, venue.loc)
  return d <= r
}