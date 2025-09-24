/* -----------------------------------------------------------------------------
 * Floq — Invite Venue Decorator
 * Second pass that decorates InviteOption[] with a recommended venue,
 * distance, and walk time, using convergence zones + venues feed.
 * No deps; pure TS. Tune weights as needed.
 * ---------------------------------------------------------------------------*/

import type { InviteOption, VibeState } from '@/lib/social/inviteEngine'

export type VenueLite = {
  id: string
  name: string
  loc: { lng: number; lat: number }
  vibeTags?: string[]          // ['hype','cozy','cocktails','coffee'...]
  openNow?: boolean
  priceLevel?: 0|1|2|3|4
  popularityLive?: number      // 0..1 if available
}

export type ConvergenceZone = {
  centroid: [number, number]   // [lng,lat]
  prob: number                 // 0..1
  vibe?: VibeState | string
}

export type DecorateInput = {
  options: InviteOption[]
  zones: ConvergenceZone[]      // from convergence-zones
  venues: VenueLite[]           // from venues-tile/details
  now?: Date
  maxDistanceM?: number         // cap search radius, default 1200 m
  walkMpm?: number              // meters per minute, default 75 (≈4.5 km/h)
}

/** Main entry */
export function decorateWithVenue(input: DecorateInput): InviteOption[] {
  const now = input.now ?? new Date()
  const maxD = input.maxDistanceM ?? 1200
  const mpm  = input.walkMpm ?? 75

  if (!input.options.length || !input.venues.length) return input.options

  // Pick a "focus area" (strongest zone)
  const zone = pickZone(input.zones)
  const focus = zone?.centroid

  return input.options.map(opt => {
    const bucket = timeOfDayBucket(now)
    const preferred = pickVenueForOption({
      option: opt,
      venues: input.venues,
      bucket,
      focus,
      maxDistanceM: maxD
    })
    if (!preferred) return opt

    const distM = distanceMeters(preferred.loc, focus)
    const mins  = Math.max(1, Math.round(distM / mpm))
    const cityText = mins <= 1 ? '1 min walk' : `${mins} min walk`
    const text = withVenueText(opt.text, preferred.name, cityText)

    const rationale = [
      `nearby (${cityText})`,
      bucketLabel(bucket),
      preferred.openNow ? 'open now' : 'may close soon'
    ]

    return {
      ...opt,
      text,
      rationale: Array.from(new Set([...(opt.rationale ?? []), ...rationale])),
      tags: Array.from(new Set([...(opt.tags ?? []), 'venue'])),
      payload: {
        ...(opt.payload ?? {}),
        venueId: preferred.id,
        venueName: preferred.name,
        venueLoc: preferred.loc,
        venueDistM: distM
      }
    }
  })
}

// --------------------------- Pickers ----------------------------------------

function pickZone(zs: ConvergenceZone[]): ConvergenceZone | undefined {
  if (!zs?.length) return undefined
  return zs.slice().sort((a,b) => (b.prob - a.prob))[0]
}

function pickVenueForOption(args: {
  option: InviteOption
  venues: VenueLite[]
  bucket: TimeBucket
  focus?: [number,number]
  maxDistanceM: number
}): VenueLite | undefined {
  const { option, venues, bucket, focus, maxDistanceM } = args
  // Short-list by distance if we have a focus
  const pool = (focus
    ? venues.filter(v => distanceMeters(v.loc, focus) <= maxDistanceM)
    : venues.slice(0))

  if (!pool.length) return venues[0]

  // Score each venue for the option
  let best: { v: VenueLite; s: number } | null = null
  for (const v of pool) {
    const s = venueScoreForOption(option, v, bucket)
    if (!best || s > best.s) best = { v, s }
  }
  return best?.v
}

function venueScoreForOption(opt: InviteOption, v: VenueLite, bucket: TimeBucket): number {
  const tags = new Set((v.vibeTags ?? []).map(normalizeTag))
  const live = clamp01(v.popularityLive ?? 0.5)

  // Time-of-day preference
  const tod =
    (bucket === 'morning' && (tags.has('coffee') || tags.has('breakfast')))  ? 1.0 :
    (bucket === 'noon'    && (tags.has('lunch') || tags.has('casual')))      ? 0.8 :
    (bucket === 'evening' && (tags.has('cocktails') || tags.has('dinner')))  ? 1.0 :
    (bucket === 'late'    && (tags.has('night') || tags.has('club')))        ? 1.0 : 0.6

  // Option intent
  const kind =
    opt.kind === 'spontaneous' ? 'spont' :
    opt.kind === 'lowkey'      ? 'low'   :
    opt.kind === 'highenergy'  ? 'high'  :
    opt.kind === 'planned'     ? 'plan'  :
    'other'

  const intent =
    (kind === 'spont' && (live > 0.45 ? 1.0 : 0.8)) ||
    (kind === 'low'   && (tags.has('cozy') || tags.has('calm') ? 1.0 : 0.7)) ||
    (kind === 'high'  && (tags.has('hype') || tags.has('live') ? 1.0 : 0.7)) ||
    (kind === 'plan'  ? 0.9 : 0.8)

  // Availability / friction
  const open = v.openNow ? 1.0 : 0.75

  // Price neutrality
  const price = 1.0 - ((v.priceLevel ?? 2) * 0.05)

  return clamp01(0.5 * tod + 0.3 * intent + 0.15 * open + 0.05 * price)
}

// ------------------------- Formatting / Utils -------------------------------

function withVenueText(base: string, venue: string, cityText: string) {
  // If base already has a venue, append distance; else add "Meet at …"
  if (/meet|join|rally|hit/i.test(base)) return `${base} — ${venue} (${cityText})`
  return `Meet at ${venue} — ${cityText}`
}

type TimeBucket = 'morning' | 'noon' | 'evening' | 'late'
function timeOfDayBucket(now: Date): TimeBucket {
  const h = now.getHours()
  if (h < 11) return 'morning'
  if (h < 16) return 'noon'
  if (h < 23) return 'evening'
  return 'late'
}
function bucketLabel(b: TimeBucket) {
  return b === 'morning' ? 'morning' : b === 'noon' ? 'midday' : b === 'evening' ? 'evening' : 'late'
}

function distanceMeters(a: {lng:number;lat:number} | undefined, focus?: [number,number]) {
  if (!a) return Infinity
  if (!focus) return 0
  return haversine(a.lat, a.lng, focus[1], focus[0])
}
function haversine(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371000; const toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1)
  const s1 = Math.sin(dLat/2)**2, s2 = Math.sin(dLon/2)**2
  const c = 2*Math.asin(Math.sqrt(s1 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2))
  return R * c
}
const clamp01 = (v:number)=>Math.max(0,Math.min(1,v))
const normalizeTag = (t:string)=>t.trim().toLowerCase()

/* --------------------------------- Usage ------------------------------------
import { generateInviteOptions } from '@/lib/social/inviteEngine'
import { decorateWithVenue }   from '@/lib/social/inviteVenueDecorator'

const base = generateInviteOptions({ tensor, context, limit: 4 })
const decorated = decorateWithVenue({
  options: base,
  zones,         // from convergence-zones
  venues,        // from venues feed
  now: new Date()
})
-----------------------------------------------------------------------------*/