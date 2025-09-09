import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
}
const ok = (b:unknown, ttl=60)=>new Response(JSON.stringify(b),{headers:{...cors,'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${ttl}`}})
const bad=(m:string,c=400)=>new Response(JSON.stringify({error:m}),{status:c,headers:{...cors,'content-type':'application/json'}})

Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:cors})
  if (req.method!=='POST')    return bad('POST required',405)
  try {
    const url  = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global:{ headers:{ Authorization: req.headers.get('Authorization')! }}})

    const { data, error } = await supa.from('venue_favorites').select('venue_id').order('created_at',{ascending:false}).limit(200)
    if (error) throw error

    return ok({ favoriteIds: (data ?? []).map(r => r.venue_id) })
  } catch (e) {
    return ok({ favoriteIds: [] }, 10) // be permissive
  }
})