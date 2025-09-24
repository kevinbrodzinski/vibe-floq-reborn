import React from 'react'
import { vibeTokens, normalizeVibeToken } from '@/lib/vibe/tokens'

type VenueLite = {
  id: string
  name: string
  photoUrl?: string | null
  loc?: { lng: number; lat: number }
  vibeTags?: string[]
  openNow?: boolean
  priceLevel?: 0|1|2|3|4
  popularityLive?: number
}

// Simple vibe token getter for the public view styling
function getVibeToken(vibe: string) {
  const token = normalizeVibeToken(vibe);
  const hex = vibeTokens[token];
  
  return {
    bg: `${hex}15`, // 15% opacity
    ring: `${hex}40`, // 40% opacity
    glow: `${hex}30`, // 30% opacity
    base: hex,
    fg: '#ffffff'
  };
}

export function PublicShortlistView({
  id, 
  name, 
  venueIds, 
  currentVibe = 'calm',
  fetchVenues, // optional override
}: {
  id: string
  name: string
  venueIds: string[]
  currentVibe?: string
  fetchVenues?: (ids: string[]) => Promise<VenueLite[]>
}) {
  const t = getVibeToken(currentVibe)
  const [venues, setVenues] = React.useState<VenueLite[] | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Fallback: just use venue IDs as names for now
        const fallback = venueIds.map(id => ({ id, name: id, photoUrl: null }))
        const data = fetchVenues ? await fetchVenues(venueIds) : fallback
        if (mounted) setVenues(data)
      } catch (e: any) {
        if (mounted) setErr(e?.message ?? 'Failed to load venues')
      }
    })()
    return () => { mounted = false }
  }, [id, venueIds, fetchVenues])

  const link = typeof window !== 'undefined' ? window.location.href : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      // Could show toast notification here
    } catch (e) {
      // Fallback for older browsers
      console.warn('Failed to copy to clipboard:', e)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-white/90 font-semibold">{name}</div>
        <div className="flex items-center gap-2">
          <button
            className="text-white/80 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/15"
            onClick={handleCopyLink}
            aria-label="Copy link"
          >
            Copy link
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {venues?.length
          ? venues.map(v => (
              <div 
                key={v.id} 
                className="relative rounded-lg overflow-hidden bg-black/30 h-[110px]"
                style={{ border:`1px solid ${t.ring}` }} 
                title={v.name}
              >
                {v.photoUrl ? (
                  <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-xs px-2 text-center">
                    {v.name}
                  </div>
                )}
              </div>
            ))
          : <div className="col-span-3 text-white/70 text-sm">No venues added yet.</div>
        }
      </div>

      {/* Mini map placeholder */}
      <div className="px-3 pb-4">
        <div 
          className="rounded-lg h-[200px] w-full flex items-center justify-center text-white/70 text-xs bg-black/20"
          style={{ border:`1px solid ${t.ring}` }}
        >
          Mini map — venue locations will appear here
        </div>
      </div>

      {err && (
        <div className="px-3 pb-3">
          <div className="text-red-400 text-sm">{err}</div>
        </div>
      )}
    </div>
  )
}