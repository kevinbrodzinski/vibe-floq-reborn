import * as geohash from 'ngeohash';

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
  const decoded = geohash.decode(hash);
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
      tiles.push(geohash.encode(lat, lng, precision));
    }
  }
  
  return tiles;
}
