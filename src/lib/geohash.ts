// src/lib/geohash.ts
// Canonical geohash encode for web/node consumers.
// Tries the 'ngeohash' package in any export shape; falls back to a local encoder.

let _externalEncode:
  | ((lat: number, lon: number, precision?: number) => string)
  | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — tolerate any export shape at runtime
  const mod = await (async () => import('ngeohash'))().catch(() => null) as any;
  const candidate =
    mod?.encode ||
    mod?.default?.encode ||
    (typeof mod?.default === 'function' ? mod.default : undefined);
  if (typeof candidate === 'function') _externalEncode = candidate;
} catch {
  // ignore; we'll fall back
}

/** Local pure-TS encoder (no deps). */
function localEncode(lat: number, lon: number, precision = 5): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0, bit = 0, even = true;
  let geohash = '';

  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;

  while (geohash.length < precision) {
    if (even) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = (idx << 1) + 1;
        lonMin = lonMid;
      } else {
        idx = (idx << 1) + 0;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = (idx << 1) + 0;
        latMax = latMid;
      }
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

/** Canonical API: use this everywhere. */
export function encodeGeohash(lat: number, lon: number, precision = 5): string {
  if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Invalid lat/lon');
  // external first (if present), else local
  try {
    return _externalEncode ? _externalEncode(lat, lon, precision) : localEncode(lat, lon, precision);
  } catch {
    return localEncode(lat, lon, precision);
  }
}