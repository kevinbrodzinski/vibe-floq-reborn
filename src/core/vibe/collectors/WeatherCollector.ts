export type WeatherSignal = { isDaylight: boolean; tempC?: number; code?: string };

const OPEN_WEATHER_KEY = (import.meta as any).env?.VITE_OPENWEATHER_KEY ?? '';
let cache: { t: number; lat: number; lng: number; data: WeatherSignal } | null = null;
const TTL = 30 * 60 * 1000;

// Simple solar fallback you already have:
function isDaylightAt(lat: number, lng: number, d = new Date()): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const h = d.getHours(); return h >= 7 && h <= 19;
  }
  const day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(),0,0)) / 86400000);
  const decl = -23.44 * Math.cos(((360/365)*(day+10)) * Math.PI/180);
  const hour = d.getUTCHours() + d.getUTCMinutes()/60;
  const lst = (hour + lng / 15) * 15; // deg
  const ha = lst - 180;
  const alt = Math.asin(
    Math.sin(lat*Math.PI/180)*Math.sin(decl*Math.PI/180) +
    Math.cos(lat*Math.PI/180)*Math.cos(decl*Math.PI/180)*Math.cos(ha*Math.PI/180)
  ) * 180/Math.PI;
  return alt > 0;
}

export async function getWeatherSignal(lat?: number, lng?: number): Promise<WeatherSignal> {
  const now = Date.now();
  if (cache && (now - cache.t) < TTL && lat && lng) {
    // Same 2dp cell cache
    const sameCell = Math.abs(cache.lat - lat) < 0.01 && Math.abs(cache.lng - lng) < 0.01;
    if (sameCell) return cache.data;
  }

  // If no key, fallback to daylight only
  if (!OPEN_WEATHER_KEY || !Number.isFinite(lat!) || !Number.isFinite(lng!)) {
    const data = { isDaylight: isDaylightAt(lat ?? NaN, lng ?? NaN) };
    cache = { t: now, lat: lat ?? 0, lng: lng ?? 0, data };
    return data;
  }

  try {
    // OneCall 3.0
    const u = new URL('https://api.openweathermap.org/data/3.0/onecall');
    u.searchParams.set('lat', String(lat));
    u.searchParams.set('lon', String(lng));
    u.searchParams.set('exclude', 'minutely,hourly,daily,alerts');
    u.searchParams.set('appid', OPEN_WEATHER_KEY);
    u.searchParams.set('units', 'metric');

    const r = await fetch(u.toString(), { cache: 'no-store' });
    const j = await r.json();

    const daylight = (j?.current?.sunrise && j?.current?.sunset)
      ? (j.current.dt >= j.current.sunrise && j.current.dt <= j.current.sunset)
      : isDaylightAt(lat!, lng!);

    const data: WeatherSignal = {
      isDaylight: !!daylight,
      tempC: typeof j?.current?.temp === 'number' ? j.current.temp : undefined,
      code: j?.current?.weather?.[0]?.main ?? undefined,
    };

    cache = { t: now, lat: lat!, lng: lng!, data };
    return data;
  } catch {
    const data = { isDaylight: isDaylightAt(lat!, lng!) };
    cache = { t: now, lat: lat!, lng: lng!, data };
    return data;
  }
}