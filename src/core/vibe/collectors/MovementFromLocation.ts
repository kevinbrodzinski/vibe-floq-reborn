// GPS → speed (m/s) with median smoothing + jitter guards
export type LngLat = { lng: number; lat: number };
type Sample = { t: number; lng: number; lat: number };
const R = 6371000; // earth radius

function haversine(a: LngLat, b: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

export class MovementFromLocationTracker {
  private buf: Sample[] = [];
  private window: number[] = [];
  private lastSpeed = 0;
  private readonly MAX_S = 8; // 8 m/s ~ 28.8 km/h (walking/running/cycling range)
  private readonly MAX_N = 8; // history length

  update(coords?: LngLat) {
    const now = Date.now();
    if (!coords) {
      this.window = [];
      this.lastSpeed = 0;
      return { speedMps: 0, moving01: 0 };
    }
    this.buf.push({ t: now, ...coords });
    if (this.buf.length > this.MAX_N) this.buf.shift();

    const b = this.buf;
    if (b.length < 2) return { speedMps: 0, moving01: 0 };

    const a = b[b.length - 2];
    const c = b[b.length - 1];
    const dt = Math.max(1, (c.t - a.t) / 1000); // s
    const d = haversine({ lng: a.lng, lat: a.lat }, { lng: c.lng, lat: c.lat }); // m
    let raw = d / dt; // m/s

    // Guards: impossible spikes / stale
    if (raw > this.MAX_S || dt > 60) raw = this.lastSpeed;

    // Median smoothing over last 5
    this.window.push(raw);
    if (this.window.length > 5) this.window.shift();
    const smoothed = [...this.window].sort((x, y) => x - y)[Math.floor(this.window.length / 2)];

    this.lastSpeed = smoothed;
    const moving01 = Math.max(0, Math.min(1, smoothed / 2)); // 0..1, ~2 m/s cap
    return { speedMps: smoothed, moving01 };
  }
}