import { buildCors } from '../_shared/cors.ts';
import { userClient } from '../_shared/supabase.ts';

Deno.serve(async req => {
  const { preflight, json, error } = buildCors(req);
  if (preflight) return preflight;

  // query-params
  const url = new URL(req.url)
  const lat = Number(url.searchParams.get('lat'))
  const lng = Number(url.searchParams.get('lng'))
  const limit = Number(url.searchParams.get('limit') || 12)
  const version = url.searchParams.get('v') || '2' // Add version for cache busting

  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return error('lat,lng required', 400)

  // Use user client for RLS enforcement
  const sb = userClient(req);

  const { data, error } = await sb
    .rpc('rank_nearby_people', { p_lat: lat, p_lng: lng, p_limit: limit })

  if (error) {
    return json({ error: error.message }, 500);
  }
  return json(data, 200, 30); // 30 second cache
})