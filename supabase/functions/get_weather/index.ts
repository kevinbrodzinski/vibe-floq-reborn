/// <reference lib="dom" />
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { lat, lng } = await req.json();           // {lat:number,lng:number}
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({ error: "lat/lng required" }),
        { status: 400, headers: CORS },
      );
    }

    const url = new URL("https://api.openweathermap.org/data/2.5/weather");
    url.searchParams.set("lat",   String(lat));
    url.searchParams.set("lon",   String(lng));
    url.searchParams.set("units", "imperial");        // °F / mph
    url.searchParams.set("appid", Deno.env.get("WEATHER_API_KEY")!);

    const r = await fetch(url.href);
    if (!r.ok) throw new Error(`upstream ${r.status}`);

    const w = await r.json();
    /* normalise */
    const out = {
      condition:   w.weather?.[0]?.main?.toLowerCase() ?? "sunny",
      temperatureF: Math.round(w.main.temp),
      feelsLikeF:   Math.round(w.main.feels_like),
      humidity:     w.main.humidity,
      windMph:      Math.round(w.wind.speed),
      icon:         w.weather?.[0]?.icon ?? "01d",
      created_at:   new Date().toISOString(),
    };

    return new Response(JSON.stringify(out), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[weather] err", err);
    return new Response(
      JSON.stringify({ error: "weather fetch failed" }),
      { status: 500, headers: CORS },
    );
  }
}); 