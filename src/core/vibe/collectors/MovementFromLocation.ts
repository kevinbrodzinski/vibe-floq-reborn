// MovementFromLocation.ts
// Derive speed (m/s) and a 0..1 moving scalar from successive GNSS points.
// SSR-safe; if coords are missing or unchanged, returns zeros.

export type LngLat = { lng: number; lat: number };

export class MovementFromLocationTracker {
  private last: { t: number; lat: number; lng: number } | null = null;

  update(coords?: LngLat) {
    if (!coords) return { speedMps: 0, moving01: 0 };
    const t = performance.now() / 1000;

    if (!this.last) {
      this.last = { t, ...coords };
      return { speedMps: 0, moving01: 0 };
    }

    const dt = Math.max(1, t - this.last.t);
    const dx = haversineM(this.last.lat, this.last.lng, coords.lat, coords.lng);
    this.last = { t, ...coords };

    const speedMps = dx / dt;
    // 0 at 0 m/s, ~1 near 2 m/s (brisk walk) and above
    const moving01 = Math.max(0, Math.min(1, speedMps / 2));
    return { speedMps, moving01 };
  }
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const toRad = (d: number) => (d * Math.PI) / 180;
