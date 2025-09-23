// src/lib/geohash.ts
// Canonical geohash encode for web/node consumers.
// Tries the 'ngeohash' package in any export shape; falls back to a local encoder.

let _externalEncode:
  | ((lat: number, lon: number, precision?: number) => string)
  | null
  | undefined = undefined;

async function tryLoadExternal(): Promise<void> {
  if (_externalEncode !== undefined) return; // already tried
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — tolerate any export shape at runtime
    const mod = (await import('ngeohash')) as any;
    const candidate =
      mod?.encode ||
      mod?.default?.encode ||
      (typeof mod?.default === 'function' ? mod.default : undefined);
    _externalEncode = typeof candidate === 'function' ? candidate : null;
  } catch {
    _externalEncode = null;
  }
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

/** Async version that attempts to load external package */
export async function encodeGeohashAsync(lat: number, lon: number, precision = 5): Promise<string> {
  if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Invalid lat/lon');
  await tryLoadExternal();
  try {
    return _externalEncode ? _externalEncode(lat, lon, precision) : localEncode(lat, lon, precision);
  } catch {
    return localEncode(lat, lon, precision);
  }
}

/** Canonical API: use this everywhere (sync fallback to local encoder) */
export function encodeGeohash(lat: number, lon: number, precision = 5): string {
  if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Invalid lat/lon');
  // Safe immediate fallback to local encoder
  return localEncode(lat, lon, precision);
}