import type { WeatherSignal, WeatherCondition } from '@/core/vibe/types';

// Global window extension for dev mock weather
declare global {
  interface Window { floq?: any }
}

const OPEN_WEATHER_KEY = (import.meta as any).env?.VITE_OPENWEATHER_KEY ?? '';
const RICH = ((import.meta as any).env?.VITE_WEATHER_RICH ?? 'off') === 'on';

type Cache = { t: number; lat: number; lng: number; data: WeatherSignal };
let cache: Cache | null = null;
const TTL = 30 * 60 * 1000; // 30 min

function isDaylightAt(lat: number, lng: number, d = new Date()): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const h = d.getHours();
    return h >= 7 && h <= 19;
  }
  const day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(),0,0))/86400000);
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

function mapCondition(main: string | undefined): WeatherCondition {
  const m = (main ?? 'unknown').toLowerCase();
  if (m.includes('clear')) return 'Clear';
  if (m.includes('cloud')) return 'Clouds';
  if (m.includes('thunder')) return 'Thunderstorm';
  if (m.includes('drizzle')) return 'Drizzle';
  if (m.includes('rain')) return 'Rain';
  if (m.includes('snow')) return 'Snow';
  if (m.includes('mist')) return 'Mist';
  if (m.includes('fog')) return 'Fog';
  if (m.includes('haze')) return 'Haze';
  if (m.includes('dust')) return 'Dust';
  if (m.includes('smoke')) return 'Smoke';
  if (m.includes('sand')) return 'Sand';
  if (m.includes('ash')) return 'Ash';
  if (m.includes('squall')) return 'Squall';
  if (m.includes('tornado')) return 'Tornado';
  return 'unknown';
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function energyOffset(cond: WeatherCondition, tempC?: number): number {
  let off = 0;
  if (cond === 'Clear' && tempC != null && tempC > 10 && tempC < 30) off += 0.10;
  if (cond === 'Thunderstorm') off -= 0.15;
  if (cond === 'Drizzle') off -= 0.05;
  if (tempC != null && (tempC < -5 || tempC > 35)) off -= 0.10;
  return clamp(off, -0.2, 0.2);
}

const confidenceBoost = (cond: WeatherCondition) => (cond === 'Clear' || cond === 'Clouds') ? 0.05 : 0;

export async function getWeatherSignal(lat?: number, lng?: number): Promise<WeatherSignal> {
  const now = Date.now();
  
  // Dev override check (before cache or network calls)
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const mw = (window.floq?.mockWeather) as Partial<WeatherSignal> | undefined;
    if (mw) {
      const data: WeatherSignal = {
        isDaylight: mw.isDaylight ?? isDaylightAt(lat ?? NaN, lng ?? NaN, new Date()),
        tempC: mw.tempC,
        condition: mw.condition,
        // Compute offsets from mock condition if provided
        energyOffset: mw.energyOffset ?? (typeof mw.condition !== 'undefined'
          ? energyOffset(mw.condition as WeatherCondition, mw.tempC)
          : undefined),
        confidenceBoost: mw.confidenceBoost ?? (typeof mw.condition !== 'undefined'
          ? confidenceBoost(mw.condition as WeatherCondition)
          : 0),
      };
      cache = { t: now, lat: lat ?? 0, lng: lng ?? 0, data };
      return data;
    }
  }
  
  if (cache && (now - cache.t) < TTL && lat && lng) {
    const same = Math.abs(cache.lat - lat) < 0.1 && Math.abs(cache.lng - lng) < 0.1;
    if (same) return cache.data;
  }

  const daylightOnly = (): WeatherSignal => {
    const data = { isDaylight: isDaylightAt(lat ?? NaN, lng ?? NaN) };
    cache = { t: now, lat: lat ?? 0, lng: lng ?? 0, data };
    return data;
  };

  if (!RICH || !OPEN_WEATHER_KEY || !Number.isFinite(lat!) || !Number.isFinite(lng!)) {
    return daylightOnly();
  }

  try {
    const u = new URL('https://api.openweathermap.org/data/2.5/weather');
    u.searchParams.set('lat', String(lat));
    u.searchParams.set('lon', String(lng));
    u.searchParams.set('appid', OPEN_WEATHER_KEY);
    u.searchParams.set('units', 'metric');

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(u.toString(), { 
      signal: ctrl.signal, 
      cache: 'no-store' 
    }).finally(() => clearTimeout(timer));
    
    if (!r.ok) return daylightOnly();

    const j = await r.json();
    const main = mapCondition(j?.weather?.[0]?.main);
    const tempC = typeof j?.main?.temp === 'number' ? j.main.temp : undefined;
    const data: WeatherSignal = {
      isDaylight: isDaylightAt(lat!, lng!),
      tempC, 
      condition: main,
      energyOffset: energyOffset(main, tempC),
      confidenceBoost: confidenceBoost(main),
    };
    cache = { t: now, lat: lat!, lng: lng!, data };
    return data;
  } catch {
    return daylightOnly();
  }
}