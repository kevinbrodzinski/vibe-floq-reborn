// supabase/functions/rally-create/index.ts
// POST { name?: string, participant_ids: string[], centroid?: [number,number], starts_at?: string, meta?: any }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
}
const ok = (b:unknown, ttl=30)=>new Response(JSON.stringify(b),{headers:{...corsHeaders,'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${ttl}`}})
const bad=(m:string,c=400)=>new Response(JSON.stringify({error:m}),{status:c,headers:{...corsHeaders,'content-type':'application/json'}})

Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:corsHeaders})
  if (req.method!=='POST')    return bad('POST required',405)
  try {
    const body = await req.json().catch(()=>null)
    const ids  = Array.isArray(body?.participant_ids) ? body.participant_ids as string[] : []
    if (!ids.length) return bad('participant_ids required', 422)
    const url  = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global:{ headers:{ Authorization: req.headers.get('Authorization')! }}})

    // 1) Prefer RPC if available
    try {
      const { data, error } = await supa.rpc('create_rally_plan', {
        name: body?.name ?? 'Rally',
        participant_ids: ids,
        centroid: body?.centroid ?? null,
        starts_at: body?.starts_at ?? null,
        meta: body?.meta ?? {}
      })
      if (!error) return ok({ ok:true, plan: data }, 10)
    } catch {}

    // 2) Try generic insert into plans/plan_participants if present
    try {
      const { data: planRow, error: e1 } = await supa.from('plans').insert({
        name: body?.name ?? 'Rally',
        centroid: body?.centroid ?? null,
        starts_at: body?.starts_at ?? new Date().toISOString(),
        meta: body?.meta ?? {}
      }).select('*').single()
      if (e1) throw e1

      // bulk insert participants
      const rows = ids.map(pid => ({ plan_id: planRow.id, profile_id: pid, joined_at: new Date().toISOString() }))
      const { error: e2 } = await supa.from('plan_participants').insert(rows)
      if (e2) throw e2

      return ok({ ok:true, plan: planRow }, 10)
    } catch {}

    // 3) Graceful fallback
    return bad('rally-create: no RPC or tables available (501)', 501)
  } catch (e) {
    return bad(e?.message ?? 'error', 500)
  }
})