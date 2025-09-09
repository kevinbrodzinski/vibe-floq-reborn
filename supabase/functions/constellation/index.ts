// supabase/functions/constellation/index.ts
// POST body (all optional):
// {
//   party: { id: string; mass?: number; vibe?: string }[],
//   edges: { a: string; b: string; strength: number; lastSync?: string }[],
//   seed?: string
// }
// → { nodes:[{id,pos:[0..1,0..1],mass,vibe}], edges:[...], ttlSec }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const okJson = (body: unknown, ttlSec = 120) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, max-age=${ttlSec}` },
  });
const bad = (msg: string, code = 400) =>
  new Response(JSON.stringify({ error: msg }), { status: code, headers: { ...corsHeaders, 'content-type': 'application/json' } });

type Party = { id: string; mass?: number; vibe?: string };
type Edge  = { a: string; b: string; strength: number; lastSync?: string };
type Node  = { id: string; pos: [number, number]; mass: number; vibe: string };

function hash(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function jitter(seed: string, amp = 0.04): [number, number] {
  const h = hash(seed);
  const r1 = ((h & 0xffff) / 0xffff) - 0.5;
  const r2 = (((h >>> 16) & 0xffff) / 0xffff) - 0.5;
  return [r1 * amp, r2 * amp];
}
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function initialLayout(party: Party[], seed = 'floq'): Node[] {
  const n = party.length;
  if (!n) return [];
  // Sort by mass (influence) desc for stable ring layout
  const sorted = [...party].sort((a, b) => (b.mass ?? 1) - (a.mass ?? 1));
  const R = 0.32; // base radius in normalized [0..1] canvas
  return sorted.map((p, i) => {
    const angle = (i / n) * Math.PI * 2;
    const cx = 0.5 + Math.cos(angle) * R;
    const cy = 0.5 + Math.sin(angle) * R;
    const [jx, jy] = jitter(seed + ':' + p.id, 0.06);
    return {
      id: p.id,
      pos: [clamp01(cx + jx), clamp01(cy + jy)],
      mass: Math.max(0.5, Math.min(3, p.mass ?? 1)),
      vibe: p.vibe ?? 'chill',
    };
  });
}

function oneAttractionStep(nodes: Node[], edges: Edge[]) {
  if (!nodes.length || !edges?.length) return;
  const map = new Map(nodes.map(n => [n.id, n]));
  for (const e of edges) {
    if (e.strength <= 0) continue;
    const a = map.get(e.a), b = map.get(e.b);
    if (!a || !b) continue;
    const dx = b.pos[0] - a.pos[0];
    const dy = b.pos[1] - a.pos[1];
    const d  = Math.hypot(dx, dy) || 1e-6;
    // Pull closer a tiny amount (bounded), scaled by strength and inverse distance
    const k  = Math.min(0.015, (0.002 + e.strength * 0.006) / d);
    const ax = dx * k, ay = dy * k;
    const bx = -dx * k, by = -dy * k;
    a.pos[0] = clamp01(a.pos[0] + ax);
    a.pos[1] = clamp01(a.pos[1] + ay);
    b.pos[0] = clamp01(b.pos[0] + bx);
    b.pos[1] = clamp01(b.pos[1] + by);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST')    return bad('POST required', 405);

  try {
    const body = await req.json().catch(() => ({}));
    const party = Array.isArray(body?.party) ? (body.party as Party[]) : [];
    const edges = Array.isArray(body?.edges) ? (body.edges as Edge[])   : [];
    const seed  = typeof body?.seed === 'string' ? body.seed : 'floq';

    if (!party.length) return okJson({ nodes: [], edges: [], ttlSec: 60 }, 60);

    const nodes = initialLayout(party, seed);
    // One light attraction step to tighten strong bonds
    oneAttractionStep(nodes, edges.filter(e => e.strength >= 0.3));

    return okJson({ nodes, edges, ttlSec: 120 }, 120);
  } catch (e) {
    return bad(e?.message ?? 'error', 500);
  }
});