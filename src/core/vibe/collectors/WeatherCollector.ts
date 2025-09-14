// Daylight flag via local solar calculation (no network) + 10 min cache
type WeatherSignal = { isDaylight: boolean; tempC?: number };
let cache: { t: number; data: WeatherSignal } | null = null;

// Minimal solar calc (approx; good for UI weighting)
function isDaylightAt(lat: number, lng: number, d = new Date()): boolean {
  // crude: day if sun altitude > 0 using simplified equation (fast)
  // fall back to 7:00–19:00 if lat/lng missing
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const h = d.getHours(); 
    return h >= 7 && h <= 19;
  }
  const dayOfYear = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
  const decl = -23.44 * Math.cos(((360 / 365) * (dayOfYear + 10)) * Math.PI / 180);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  const lst = (hour + lng / 15) * 15; // deg
  const ha = lst - 180; // rough hour angle
  const alt = Math.asin(
    Math.sin(lat * Math.PI / 180) * Math.sin(decl * Math.PI / 180) +
    Math.cos(lat * Math.PI / 180) * Math.cos(decl * Math.PI / 180) * Math.cos(ha * Math.PI / 180)
  ) * 180 / Math.PI;
  return alt > 0;
}

export async function getWeatherSignal(lat?: number, lng?: number): Promise<WeatherSignal> {
  const now = Date.now();
  if (cache && now - cache.t < 10 * 60 * 1000) return cache.data;

  const isDaylight = isDaylightAt(lat ?? NaN, lng ?? NaN, new Date());
  const data: WeatherSignal = { isDaylight, tempC: undefined };
  cache = { t: now, data }; 
  return data;
}