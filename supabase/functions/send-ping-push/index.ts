// supabase/functions/send-ping-push/index.ts
// Fan-out push notifications for a ping (or any payload).
// Supports Expo tokens out-of-the-box; stubs for FCM/APNs you can wire later.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
} as const
const ok  = (b:unknown, ttl=60) => new Response(JSON.stringify(b), { headers: { ...CORS, 'content-type':'application/json', 'cache-control':`public, max-age=${ttl}` } })
const bad = (m:string, c=400)   => new Response(JSON.stringify({ error:m }),        { status:c, headers: { ...CORS, 'content-type':'application/json' } })

type PingPoint = { lng:number; lat:number; etaMin:number; prob:number }
type Body = {
  recipient_ids: string[]       // profile_ids to notify
  title?: string
  body?: string
  data?: Record<string, unknown>
  point?: PingPoint              // optional extra payload
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return bad('POST required', 405)

  let body: Body
  try { body = await req.json() } catch { return bad('invalid JSON', 422) }

  if (!Array.isArray(body.recipient_ids) || body.recipient_ids.length === 0) {
    return bad('recipient_ids required', 422)
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!, // function should be SECURITY DEFINER if you later add an RPC
    { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } }
  )

  // Fetch device tokens for recipients
  const { data: tokens, error: tokErr } = await supa
    .from('device_tokens')
    .select('profile_id, token, platform')
    .in('profile_id', body.recipient_ids)
    .limit(2000)
  if (tokErr) return bad(tokErr.message, 500)

  const expoMsgs = []
  const fcmMsgs  = [] // fill later if needed
  const apnsMsgs = []

  const title = body.title ?? 'Floq'
  const msg   = body.body  ?? 'You have a new ping'
  const data  = body.data  ?? {}
  const point = body.point ? { point: body.point } : {}

  for (const t of (tokens ?? [])) {
    const token = String(t.token)
    if (token.startsWith('ExponentPushToken[')) {
      expoMsgs.push({ to: token, sound: 'default', title, body: msg, data: { ...data, ...point } })
    } else if (token.startsWith('fcm:')) {
      fcmMsgs.push({ token: token.slice(4), notification: { title, body: msg }, data: { ...data, ...point } })
    } else if (token.startsWith('apns:')) {
      apnsMsgs.push({ token: token.slice(5), aps: { alert: { title, body: msg } }, data: { ...data, ...point } })
    }
  }

  const results: Record<string, unknown> = { expo:0, fcm:0, apns:0 }

  // Expo push API
  if (expoMsgs.length) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(expoMsgs)
      })
      const j = await res.json()
      results.expo = j?.data?.length ?? 0
    } catch (e) {
      // swallow errors to not block – log instead
      console.error('[send-ping-push] expo error', e)
    }
  }

  // TODO: Wire FCM & APNs when credentials are set (ENV based)
  // Keep placeholders so function remains stable.
  results.fcm  = fcmMsgs.length
  results.apns = apnsMsgs.length

  return ok({ sent: results })
})
