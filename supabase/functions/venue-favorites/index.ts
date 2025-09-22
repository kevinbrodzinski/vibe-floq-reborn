import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildCors } from '../_shared/cors.ts';

Deno.serve(async (req)=>{
  const { preflight, json, error } = buildCors(req);
  if (preflight) return preflight;
  if (req.method!=='POST')    return error('POST required',405)
  try {
    const url  = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const supa = createClient(url, anon, { global:{ headers:{ Authorization: req.headers.get('Authorization')! }}})

    const { data, error } = await supa.from('venue_favorites').select('venue_id').order('created_at',{ascending:false}).limit(200)
    if (error) throw error

    return json({ favoriteIds: (data ?? []).map(r => r.venue_id) })
  } catch (e) {
    return json({ favoriteIds: [] }, 200, 10) // be permissive
  }
})