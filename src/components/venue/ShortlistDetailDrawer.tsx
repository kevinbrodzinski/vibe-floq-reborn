import React from 'react'
import { vibeTokens, normalizeVibeToken } from '@/lib/vibe/tokens'
import { mintShortlistToken } from '@/lib/api/shortlistShare'

// Simple vibe token getter for the drawer styling  
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

export function ShortlistDetailDrawer({
  open, 
  onClose, 
  shortlist, 
  venues, 
  currentVibe = 'calm'
}: {
  open: boolean
  onClose: () => void
  shortlist: { id: string; name: string; venueIds: string[] }
  venues: Array<{ id:string; name:string; photoUrl?:string|null; loc?:{lng:number;lat:number} }>
  currentVibe?: string
}) {
  const t = getVibeToken(currentVibe)
  const [shareUrl, setShareUrl] = React.useState<string>('')
  const [sharing, setSharing] = React.useState(false)

  if (!open) return null

  const list = shortlist.venueIds.map(id => venues.find(v => v.id===id)).filter(Boolean) as typeof venues

  const handleCopyLink = async () => {
    try {
      setSharing(true)
      const { token } = await mintShortlistToken(shortlist.id, 7)
      const url = `${window.location.origin}/s/${token}`
      await navigator.clipboard.writeText(url)
      setShareUrl(url)
      // Could show success toast here
    } catch (e) {
      console.error('Failed to create share link:', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div
      role="dialog" 
      aria-label="Shortlist detail"
      className="fixed inset-0 z-[640] flex"
      style={{ background:'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="ml-auto w-[520px] h-full shadow-2xl backdrop-blur flex flex-col"
        style={{ 
          background: t.bg, 
          borderLeft: `1px solid ${t.ring}`, 
          boxShadow: `0 0 24px ${t.glow}` 
        }}
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-white/90 text-sm font-semibold truncate">{shortlist.name}</div>
          <div className="flex items-center gap-2">
            <button 
              className="text-white/80 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 disabled:opacity-50" 
              onClick={handleCopyLink}
              disabled={sharing}
            >
              {sharing ? 'Creating...' : 'Copy link'}
            </button>
            <button 
              className="text-white/80 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/15" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {/* Photos */}
        <div className="grid grid-cols-3 gap-2 p-3 overflow-y-auto">
          {list.map(v => (
            <div 
              key={v.id} 
              className="relative rounded-lg overflow-hidden bg-black/30 h-[100px]" 
              style={{ border: `1px solid ${t.ring}` }}
            >
              {v.photoUrl ? (
                <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/70 text-xs px-2 text-center">
                  {v.name}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mini map placeholder */}
        <div className="px-3 pb-3">
          <div 
            className="rounded-lg h-[180px] w-full flex items-center justify-center text-white/70 text-xs bg-black/20"
            style={{ border: `1px solid ${t.ring}` }}
          >
            Mini map (venue locations) — pass Mapbox here if available
          </div>
        </div>
        
        {shareUrl && (
          <div className="px-3 pb-3">
            <div className="text-white/60 text-xs">
              Share link: {shareUrl.substring(0, 50)}...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}