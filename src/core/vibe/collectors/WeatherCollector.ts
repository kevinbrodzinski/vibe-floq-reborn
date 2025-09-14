// WeatherCollector.ts
// Lightweight daylight/temp signal with 10-min cache (no network by default).

export type WeatherSignal = {
  isDaylight: boolean;
  tempC?: number;
};

let cache: { t: number; data: WeatherSignal } | null = null;

export async function getWeatherSignal(lat?: number, lng?: number): Promise<WeatherSignal> {
  const now = Date.now();
  if (cache && now - cache.t < 10 * 60 * 1000) return cache.data;

  // Simple local daylight heuristic: 7:00–19:00 is "day"
  const hour = new Date().getHours();
  const isDaylight = hour >= 7 && hour <= 19;

  const data: WeatherSignal = { isDaylight, tempC: undefined };
  cache = { t: now, data };
  return data;
}