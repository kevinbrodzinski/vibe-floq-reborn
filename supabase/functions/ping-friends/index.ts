// supabase/functions/ping-friends/index.ts
// POST { point:{lng,lat,etaMin,prob}, message?:string, ttlSec?:number }
// -> { recipients:string[], ping:{ token:string, ttlSec:number, point, message, createdAt:string } }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ok  = (b: unknown, ttl = 60) => new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` }});
const bad = (m: string, c=400) => new Response(JSON.stringify({ error: m }), { status: c, headers: { ...CORS, 'content-type': 'application/json' }});

type Body = {
  point: { lng:number; lat:number; etaMin:number; prob:number };
  message?: string;
  ttlSec?: number;    // default 600
};

function token(n=22) {
  const abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = ''; for (let i=0;i<n;i++) s += abc[Math.floor(Math.random()*abc.length)];
  return s;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')     return bad('POST required', 405);

  let body: Body;
  try { body = await req.json(); } catch { return bad('invalid JSON', 422); }

  // Validate inputs
  if (!body?.point || !Number.isFinite(body.point.lng) || !Number.isFinite(body.point.lat)) {
    return bad('invalid point', 422);
  }
  const ttlSec = Math.max(60, Math.min(3600, Math.floor(body.ttlSec ?? 600)));
  const msg = (body.message || '').toString().slice(0, 140);

  // Supabase client with user JWT (RLS intact)
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  );

  // Who's calling?
  const { data: auth } = await supa.auth.getUser();
  const pid = auth?.user?.id;
  if (!pid) return bad('not authenticated', 401);

  // Friends (accepted): derive other side of edge
  // Table: friendships(profile_low, profile_high, friend_state)
  const { data: rows, error: fErr } = await supa
    .from('friendships')
    .select('profile_low, profile_high, friend_state')
    .or(`profile_low.eq.${pid},profile_high.eq.${pid}`)
    .eq('friend_state', 'accepted');

  if (fErr) return bad(fErr.message, 500);

  const recipients = Array.from(
    new Set(
      (rows ?? []).map(r => r.profile_low === pid ? r.profile_high : r.profile_low)
                  .filter(Boolean)
    )
  );

  // Fabricate a ping token (no write yet; you can later persist/notify server-side)
  const payload = {
    token: token(),
    ttlSec,
    point: {
      lng: Number(body.point.lng),
      lat: Number(body.point.lat),
      etaMin: Math.max(0, Math.round(Number(body.point.etaMin ?? 0))),
      prob: Math.max(0, Math.min(1, Number(body.point.prob ?? 0))),
    },
    message: msg || undefined,
    createdAt: new Date().toISOString(),
  };

  // Return recipients + ping payload for the client to deliver through your preferred channel
  return ok({ recipients, ping: payload }, ttlSec);
});