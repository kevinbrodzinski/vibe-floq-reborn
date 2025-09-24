import type { InviteOption } from '@/lib/social/inviteEngine'

export type VenueLite = {
  id: string
  name: string
  loc: { lng: number; lat: number }
  vibeTags?: string[]
  openNow?: boolean
  priceLevel?: 0|1|2|3|4
  popularityLive?: number
  photoUrl?: string | null
}

/**
 * Apply a selected venue to an invite option, updating text and payload
 */
export function applyVenue(opt: InviteOption, v: VenueLite, minsWalk: number): InviteOption {
  const cityText = minsWalk <= 1 ? '1 min walk' : `${minsWalk} min walk`
  
  // Smart text formatting based on existing option text
  const text = /meet|join|rally|hit/i.test(opt.text)
    ? `${opt.text} — ${v.name} (${cityText})`
    : `Meet at ${v.name} — ${cityText}`

  return {
    ...opt,
    text,
    payload: { 
      ...(opt.payload ?? {}), 
      venueId: v.id, 
      venueName: v.name, 
      venueLoc: v.loc,
      venueDistM: minsWalk * 75 // convert back to meters assuming 75m/min
    }
  }
}

/**
 * Distance calculation helper for venue applications
 */
export function distanceMeters(a: {lng:number;lat:number} | undefined, focus?: [number,number]): number {
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