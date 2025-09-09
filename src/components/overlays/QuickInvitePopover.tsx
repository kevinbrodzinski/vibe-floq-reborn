import React from 'react'
import { InvitePopoverBody } from '@/components/overlays/InvitePopoverBody'
import { VenueChooserPanel, type VenueLite } from '@/components/venue/VenueChooserPanel'
import { applyVenue } from '@/lib/social/applyVenue'
import type { InviteOption } from '@/lib/social/inviteEngine'

export function QuickInvitePopover({
  userId, onClose, onInvite, onDM, onAddToPlan,
  invites,        // InviteOption[] (already decorated with venue via decorator)
  venues,         // VenueLite[] for chooser
  focus,          // [lng,lat] centroid for distance calc (optional)
  confidence,     // 0..1 (optional)
  horizonLabel,   // 'Now' | '+30m' | '+2h' (optional)
}: {
  userId: string
  onClose: () => void
  onInvite: (id: string) => void
  onDM?: (id: string) => void
  onAddToPlan?: (id: string) => void
  invites?: InviteOption[]
  venues?: VenueLite[]
  focus?: [number, number]
  confidence?: number
  horizonLabel?: string
}) {
  const top = invites?.[0]
  const [chooserOpen, setChooserOpen] = React.useState(false)
  const [currentTop, setCurrentTop] = React.useState<InviteOption | undefined>(top)

  // Fallback to simple invite if no smart invites provided
  if (!top || !invites) {
    return (
      <div
        className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[610] bg-black/60 backdrop-blur
                   px-16 py-12 rounded-2xl flex items-center gap-12"
        style={{ border: '1px solid rgba(255,255,255,0.2)' }}
        role="dialog" aria-label="Quick invite"
      >
        <div className="text-white/90 text-sm">Invite this friend?</div>

        <button
          onClick={() => { onInvite(userId); onClose() }}
          className="px-12 py-8 rounded-xl text-sm bg-white/20 text-white hover:bg-white/30"
        >
          Invite to Tonight
        </button>

        {onDM && (
          <button onClick={() => { onDM(userId); onClose() }} className="px-12 py-8 rounded-xl text-sm bg-white/10 text-white/80">
            DM
          </button>
        )}

        {onAddToPlan && (
          <button onClick={() => { onAddToPlan(userId); onClose() }} className="px-12 py-8 rounded-xl text-sm bg-white/10 text-white/80">
            Add to Plan
          </button>
        )}

        <button onClick={onClose} className="px-12 py-8 rounded-xl text-sm bg-white/10 text-white/80">
          Cancel
        </button>
      </div>
    )
  }

  // Primary action dispatch
  const handlePrimary = (opt: InviteOption) => {
    switch (opt.kind) {
      case 'spontaneous':
      case 'lowkey':
      case 'highenergy':
      case 'reconnect':
        // Single-user rally/invite flows; you already wire these up in parent
        onInvite(userId)
        break
      case 'planned':
        // Let parent open planned window flow (opt.at or opt.when is provided)
        onInvite(userId)
        break
      default:
        onInvite(userId)
    }
    onClose()
  }

  // Venue chooser integration
  const handleVenueSelect = (v: VenueLite) => {
    if (!currentTop) return
    const distM = v.loc && focus ? haversineMeters(v.loc.lat, v.loc.lng, focus[1], focus[0]) : undefined
    const next = applyVenue(currentTop, v, Math.round((distM ?? 0) / 75))
    setCurrentTop(next)
    setChooserOpen(false)
  }

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[610] bg-black/60 backdrop-blur px-16 py-12 rounded-2xl"
      style={{ border: '1px solid rgba(255,255,255,0.2)', width: 360 }}
      role="dialog" aria-label="Invite"
    >
      <InvitePopoverBody
        top={currentTop}
        confidence={confidence}
        horizonLabel={horizonLabel}
        onPrimary={handlePrimary}
        onChangeVenue={venues ? () => setChooserOpen(true) : undefined}
      />

      {/* Footer actions (optional): DM / Add to plan / Cancel */}
      <div className="mt-4 flex items-center gap-2">
        {onDM && (
          <button onClick={() => { onDM(userId); onClose() }}
                  className="px-3 py-2 rounded-md bg-white/10 text-white/85 text-xs">
            DM
          </button>
        )}
        {onAddToPlan && (
          <button onClick={() => { onAddToPlan(userId); onClose() }}
                  className="px-3 py-2 rounded-md bg-white/10 text-white/85 text-xs">
            Add to Plan
          </button>
        )}
        <button onClick={onClose} className="ml-auto px-3 py-2 rounded-md bg-white/10 text-white/70 text-xs">
          Cancel
        </button>
      </div>

      {/* Venue chooser (overlay panel under the popover) */}
      {chooserOpen && venues && currentTop && (
        <div className="relative mt-3">
          <VenueChooserPanel
            style={{ position:'relative' }}       // we render inline under the popover
            option={currentTop}
            venues={venues}
            focus={focus}
            excludeVenueId={(currentTop.payload?.venueId as string) || null}
            onSelect={handleVenueSelect}
            onPreview={(v)=>{/* center map on v.loc if you want */}}
            onClose={() => setChooserOpen(false)}
            currentVibe="social"
            bias="neutral"
          />
        </div>
      )}
    </div>
  )
}

/** local haversine (meters) for quick distance; replace with your util if you have one */
function haversineMeters(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371000; const toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1)
  const s1 = Math.sin(dLat/2)**2, s2 = Math.sin(dLon/2)**2
  const c = 2*Math.asin(Math.sqrt(s1 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2))
  return R * c
}