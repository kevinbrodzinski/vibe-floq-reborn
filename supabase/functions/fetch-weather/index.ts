import { corsHeadersFor, handlePreflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;

  const headers = { ...corsHeadersFor(req), 'Cache-Control': 'public, max-age=900' }; // 15 min cache
  try {
    const { lat, lng } = await req.json().catch(() => ({}));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid lat/lng' }), { status: 400, headers });
    }

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,precipitation,visibility,wind_speed_10m` + // Fixed 'current=' (not '¤t=')
      `&timezone=auto`;

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 3500);
    const resp = await fetch(url, { signal: ac.signal }).catch(() => null);
    clearTimeout(timeout);

    const data = await resp?.json().catch(() => null);
    const cur = data?.current;
    if (!cur) {
      // graceful fallback
      return new Response(JSON.stringify({
        condition: 'clear', temperatureF: 70, feelsLikeF: 70, humidity: 50,
        windMph: 5, precipitationMm: 0, visibilityKm: 10, updated_at: new Date().toISOString()
      }), { status: 200, headers });
    }

    const precipitationMm = Number(cur.precipitation ?? 0);
    const visibilityKm    = Number(cur.visibility ?? 10);
    const windMph         = Math.round((cur.wind_speed_10m ?? 2) * 0.621371);
    const temperatureF    = Math.round((cur.temperature_2m ?? 21) * 9/5 + 32);

    return new Response(JSON.stringify({
      condition: precipitationMm > 0.5 ? 'rainy' : visibilityKm < 5 ? 'foggy' : windMph > 20 ? 'windy' : 'clear',
      temperatureF, feelsLikeF: temperatureF, humidity: 50,
      windMph, precipitationMm, visibilityKm, updated_at: new Date().toISOString()
    }), { status: 200, headers });

  } catch (e) {
    console.error('[fetch-weather] error:', e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers });
  }
});

function getConditionFromData(current: any): string {
  const precip = current.precipitation || 0;
  const visibility = current.visibility || 10;
  
  if (precip > 0.5) return 'rainy';
  if (visibility < 5) return 'foggy';
  if (current.wind_speed_10m > 20) return 'windy';
  
  return 'clear';
}