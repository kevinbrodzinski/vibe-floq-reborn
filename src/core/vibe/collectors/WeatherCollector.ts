export type WeatherSignal = { isDaylight: boolean; tempC?: number; code?: string; moodImpact?: number };

const OPEN_WEATHER_KEY = (import.meta as any).env?.VITE_OPENWEATHER_KEY ?? '';
let cache: { t: number; key: string; data: WeatherData } | null = null;
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

type WeatherData = {
  isDaylight: boolean;
  tempC?: number;
  condition?: string;
  moodImpact?: number; // -0.3..+0.3 (lightly used)
};

function moodImpactFromOW(main: string, tempC: number | undefined): number {
  let impact = 0;
  if (main === 'Clear') impact += 0.1;
  if (main === 'Rain') impact -= 0.1;
  if (main === 'Thunderstorm') impact -= 0.2;
  if (tempC != null) {
    if (tempC < 0 || tempC > 35) impact -= 0.1;
    if (tempC >= 18 && tempC <= 25) impact += 0.05;
  }
  return Math.max(-0.3, Math.min(0.3, impact));
}

export async function getWeatherSignal(lat?: number, lng?: number): Promise<WeatherData> {
  const key = `${(lat ?? NaN).toFixed(1)},${(lng ?? NaN).toFixed(1)}`;
  const now = Date.now();
  if (cache && cache.key === key && now - cache.t < 30 * 60_000) return cache.data;

  const isDaylight = isDaylightAt(lat ?? NaN, lng ?? NaN, new Date());
  let out: WeatherData = { isDaylight };

  if (OPEN_WEATHER_KEY && Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      const u = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPEN_WEATHER_KEY}`;
      const r = await fetch(u);
      if (r.ok) {
        const j = await r.json();
        const main = j.weather?.[0]?.main || 'Unknown';
        const tempC = typeof j.main?.temp === 'number' ? (j.main.temp - 273.15) : undefined;
        out = {
          isDaylight,
          tempC,
          condition: main,
          moodImpact: moodImpactFromOW(main, tempC),
        };
      }
    } catch {}
  }

  cache = { key, t: now, data: out };
  return out;
}