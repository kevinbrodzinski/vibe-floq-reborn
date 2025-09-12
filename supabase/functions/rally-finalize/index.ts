import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ok  = (b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,'content-type':'application/json'}});
const bad = (m:string,s=400)=>ok({error:m},s);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')    return bad('POST only',405);

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  );

  // Auth
  const { data: auth } = await supa.auth.getUser();
  const me = auth?.user?.id;
  if (!me) return bad('not authenticated',401);

  // Body
  let body: { rallyId:string; endedAt?:string|null }|null = null;
  try { body = await req.json(); } catch { return bad('invalid JSON',422) }
  if (!body?.rallyId) return bad('rallyId required',422);

  console.log('Finalizing rally:', body.rallyId);

  // Load rally, thread, invites, center/venue if any
  const { data: rally, error: rErr } = await supa
    .from('rallies')
    .select('id, creator_id, created_at, expires_at, center, venue_id')
    .eq('id', body.rallyId)
    .single();
  if (rErr || !rally) return bad('rally not found',404);

  const { data: thread } = await supa
    .from('rally_threads')
    .select('id, participants')
    .eq('rally_id', rally.id)
    .limit(1).maybeSingle();

  const { data: invites } = await supa
    .from('rally_invites')
    .select('to_profile, status')
    .eq('rally_id', rally.id);

  // participants json
  const participantIds = (thread?.participants ?? []).filter(Boolean);
  const joinedIds = (invites ?? []).filter(i => i.status==='joined').map(i=>i.to_profile);
  const allIds = Array.from(new Set([rally.creator_id, ...participantIds, ...joinedIds]));

  // minimal participant payloads; fetch names/avatars if you want richer metadata
  const participants = allIds.map(id => ({ id, name: null, avatar: null }));

  // Heuristic interaction strength (more joiners → stronger)
  const interaction = Math.min(1, Math.max(0.2, (joinedIds.length+1)/8));

  // ended_at
  const endedAt = body.endedAt ? new Date(body.endedAt) : new Date();

  // For each participant, upsert rally moment
  const centerGeom = rally.center ?? null;
  const meta = { rally_id: rally.id, created_at: rally.created_at, expires_at: rally.expires_at };

  let updated = 0;
  for (const pid of allIds) {
    const { error } = await supa.rpc('upsert_rally_afterglow_moment', {
      _profile_id: pid,
      _rally_id: rally.id,
      _started_at: rally.created_at,
      _ended_at: endedAt.toISOString(),
      _center: centerGeom,            // geometry(Point,4326) from table
      _venue_id: rally.venue_id ?? null,
      _interaction: interaction,
      _participants: participants,
      _metadata: meta
    });
    if (error) {
      console.warn('upsert_rally_afterglow_moment failed for', pid, error);
    } else {
      updated++;
    }
  }

  console.log('Rally finalized:', rally.id, 'updated:', updated);

  return ok({ ok: true, rallyId: rally.id, updated });
});