// Enhanced geometry parsing with fallbacks
export function parseGeomLoose(g: any): { lng: number; lat: number } | null {
  if (!g) return null;
  
  // GeoJSON format
  if (g.coordinates && Array.isArray(g.coordinates)) {
    const [lng, lat] = g.coordinates;
    return isFinite(lng) && isFinite(lat) ? { lng, lat } : null;
  }
  
  // WKT format
  if (typeof g === 'string') {
    const m = g.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (m) {
      const lng = +m[1], lat = +m[2];
      return isFinite(lng) && isFinite(lat) ? { lng, lat } : null;
    }
  }
  
  // Object with lng/lat properties
  if ('lng' in g && 'lat' in g) {
    const { lng, lat } = g;
    return isFinite(lng) && isFinite(lat) ? { lng, lat } : null;
  }
  
  // Object with x/y properties (fallback)
  if ('x' in g && 'y' in g) {
    const { x, y } = g;
    return isFinite(x) && isFinite(y) ? { lng: x, lat: y } : null;
  }
  
  return null;
}

// Pace bucket guard to ensure monotonic ordering
export function validatePaceBuckets(paceCfg: any) {
  const ordered = [
    ['strollMin', 'steadyMin'],
    ['steadyMin', 'briskMin'], 
    ['briskMin', 'rushMin'],
  ] as const;
  
  for (const [a, b] of ordered) {
    if ((paceCfg as any)[a] >= (paceCfg as any)[b]) {
      (paceCfg as any)[b] = (paceCfg as any)[a] + 1; // nudge up 1 m/min
    }
  }
  
  return paceCfg;
}