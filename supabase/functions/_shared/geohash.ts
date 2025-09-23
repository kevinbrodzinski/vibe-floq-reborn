// supabase/functions/_shared/geohash.ts
// Pure-TS geohash encode for Deno edge functions (no npm deps).
export function encodeGeohash(lat: number, lon: number, precision = 5): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0, bit = 0, even = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (even) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) { idx = (idx << 1) + 1; lonMin = lonMid; }
      else               { idx = (idx << 1) + 0; lonMax = lonMid; }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) { idx = (idx << 1) + 1; latMin = latMid; }
      else               { idx = (idx << 1) + 0; latMax = latMid; }
    }
    even = !even;
    bit++;
    if (bit === 5) {
      geohash += base32[idx];
      bit = 0;
      idx = 0;
    }
  }
  return geohash;
}