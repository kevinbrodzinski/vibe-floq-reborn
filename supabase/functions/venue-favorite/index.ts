import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const C = {
  cors: {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
  }
}
const ok = (b:unknown, ttl=30)=>new Response(JSON.stringify(b),{headers:{...C.cors,'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${ttl}`}})
const bad=(m:string,c=400)=>new Response(JSON.stringify({error:m}),{status:c,headers:{...C.cors,'content-type':'application/json'}})

// in-memory fallback per instance
const mem = new Map<string, boolean>() // key = `${userId}:${venueId}`

Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:C.cors})
  if (req.method!=='POST')    return bad('POST required',405)
  try {
    const body = await req.json().catch(()=>null) as { venue_id?: string; op?: 'toggle'|'set'; value?: boolean }
    const venueId = body?.venue_id
    if (!venueId) return bad('venue_id required', 422)

    const url  = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global:{ headers:{ Authorization: req.headers.get('Authorization')! }}})

    let userId = ''
    try { userId = (await supa.auth.getUser()).data.user?.id ?? '' } catch {}
    const key = userId ? `${userId}:${venueId}` : (req.headers.get('x-forwarded-for') ?? 'anon')+':'+venueId

    // Prefer table
    try {
      const { data: row } = await supa
        .from('venue_favorites')
        .select('venue_id')
        .eq('venue_id', venueId)
        .maybeSingle()

      let desired = body?.value
      if (body?.op === 'toggle' || desired == null) desired = !row

      if (desired) {
        if (!row) await supa.from('venue_favorites').upsert({ venue_id: venueId })
        mem.set(key, true)
        return ok({ favorited: true })
      } else {
        if (row) await supa.from('venue_favorites').delete().eq('venue_id', venueId)
        mem.set(key, false)
        return ok({ favorited: false })
      }
    } catch {
      // Fallback to memory
      const current = mem.get(key) ?? false
      const desired = body?.op === 'toggle' ? !current : !!body?.value
      mem.set(key, desired)
      return ok({ favorited: desired })
    }
  } catch (e) {
    return bad(e?.message ?? 'error', 500)
  }
})