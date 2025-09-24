import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
}
const ok=(b:unknown,ttl=30)=>new Response(JSON.stringify(b),{headers:{...cors,'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${ttl}`}})
const bad=(m:string,c=400)=>new Response(JSON.stringify({error:m}),{status:c,headers:{...cors,'content-type':'application/json'}})

Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:cors})
  if (req.method!=='POST') return bad('POST required',405)
  try {
    const body = await req.json().catch(()=>null) as { id?: string; name?: string }
    const id = body?.id, name = (body?.name ?? '').toString().slice(0,64)
    if (!id || !name) return bad('id and name required', 422)

    const url  = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global:{ headers:{ Authorization: req.headers.get('Authorization')! }}})

    const { error } = await supa.from('venue_shortlists').update({ name }).eq('id', id)
    if (error) throw error
    return ok({ ok:true })
  } catch (e) {
    return bad(e?.message ?? 'error', 500)
  }
})