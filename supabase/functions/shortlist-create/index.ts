import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
}
const ok = (b:unknown, ttl=30)=>new Response(JSON.stringify(b),{headers:{...cors,'content-type':'application/json','cache-control':`public, max-age=${ttl}`}})
const bad=(m:string,c=400)=>new Response(JSON.stringify({error:m}),{status:c,headers:{...cors,'content-type':'application/json'}})

Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:cors})
  if (req.method!=='POST')    return bad('POST required',405)
  try {
    const body = await req.json().catch(()=>null) as { name?: string; venue_ids?: string[] }
    const name = (body?.name || 'Shortlist').toString().slice(0,64)
    const ids  = Array.isArray(body?.venue_ids) ? body!.venue_ids.filter(Boolean) : []
    if (!ids.length) return bad('venue_ids required', 422)

    const url  = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global:{ headers:{ Authorization: req.headers.get('Authorization')! }}})

    const { data: row, error: e1 } = await supa.from('venue_shortlists').insert({ name }).select('id').single()
    if (e1) throw e1
    const items = ids.map(v => ({ shortlist_id: row.id, venue_id: v }))
    const { error: e2 } = await supa.from('venue_shortlist_items').insert(items)
    if (e2) throw e2

    return ok({ id: row.id })
  } catch (e) { return bad(e?.message ?? 'error', 500) }
})