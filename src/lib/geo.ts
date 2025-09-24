
import { encodeGeohash } from '@/lib/geohash';

// Decode geohash to center coordinates (fallback implementation)
function decodeGeohash(hash: string): { latitude: number; longitude: number } {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let even = true;
  let lat = [-90, 90];
  let lon = [-180, 180];

  for (let i = 0; i < hash.length; i++) {
    const char = hash[i];
    const cd = base32.indexOf(char);
    if (cd === -1) throw new Error(`Invalid geohash character: ${char}`);

    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (even) {
        const mid = (lon[0] + lon[1]) / 2;
        if (cd & mask) lon[0] = mid;
        else lon[1] = mid;
      } else {
        const mid = (lat[0] + lat[1]) / 2;
        if (cd & mask) lat[0] = mid;
        else lat[1] = mid;
      }
      even = !even;
    }
  }

  return {
    latitude: (lat[0] + lat[1]) / 2,
    longitude: (lon[0] + lon[1]) / 2
  };
}

export function haversineMeters(a:{lat:number; lng:number}, b:{lat:number; lng:number}) {
  const R = 6371e3;
  const toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(b.lat-a.lat);
  const dLng = toRad(b.lng-a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

// crude ETA (keeps everything in-app; we can swap to server routes later)
export function etaMinutesMeters(distance_m:number, mode:"walk"|"drive"="walk") {
  const mps = mode==="drive" ? 8.3 : 1.35; // ~30 km/h vs ~4.8 km/h
  return Math.max(1, Math.round(distance_m / mps / 60));
}

// Convert geohash to center coordinates
export function geohashToCenter(hash: string): [number, number] {
  const decoded = decodeGeohash(hash);
  return [decoded.latitude, decoded.longitude];
}

// Convert crowd count to visual radius
export function crowdCountToRadius(count: number): number {
  // Base radius with logarithmic scaling for crowd visualization
  const baseRadius = 8;
  const scaleFactor = 2;
  return baseRadius + Math.log(Math.max(1, count)) * scaleFactor;
}

// Convert viewport bounds to tile IDs for field visualization
export function viewportToTileIds(
  minLat: number, 
  maxLat: number, 
  minLng: number, 
  maxLng: number,
  precision: number = 5
): string[] {
  const tiles: string[] = [];
  const step = Math.pow(0.5, precision); // Geohash precision step size
  
  for (let lat = minLat; lat <= maxLat; lat += step) {
    for (let lng = minLng; lng <= maxLng; lng += step) {
      tiles.push(encodeGeohash(lat, lng, precision));
    }
  }
  
  return tiles;
}
