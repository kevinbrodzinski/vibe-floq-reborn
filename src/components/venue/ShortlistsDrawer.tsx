import React from 'react'
import { listShortlists, deleteShortlist, renameShortlist } from '@/lib/api/venueShortlists'
import { vibeTokens, normalizeVibeToken } from '@/lib/vibe/tokens'

type ShortlistRow = { id: string; name: string; venueIds: string[]; created_at?: string }

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

export function ShortlistsDrawer({
  open, onClose, onApply, currentVibe = 'calm'
}: {
  open: boolean
  onClose: () => void
  onApply: (venueIds: string[], shortlist: { id: string; name: string }) => void
  currentVibe?: string
}) {
  const [rows, setRows] = React.useState<ShortlistRow[] | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const t = getVibeToken(currentVibe)

  React.useEffect(() => {
    if (!open) return
    setRows(null)
    ;(async () => {
      const data = await listShortlists()
      setRows(data)
    })().catch(() => setRows([]))
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog" aria-label="My shortlists"
      className="fixed right-0 top-0 bottom-0 w-[360px] z-[650] shadow-2xl backdrop-blur"
      style={{ background: t.bg, borderLeft: `1px solid ${t.ring}`, boxShadow: `0 0 24px ${t.glow}` }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-white/90 text-sm font-semibold">My shortlists</div>
        <button
          className="text-white/80 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/15"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-56px)]">
        {rows === null ? (
          <div className="px-4 py-6 text-white/70 text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-white/70 text-sm">
            No shortlists yet. Save picks from the venue chooser to see them here.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-white/90 text-sm font-semibold truncate">{r.name}</div>
                    <div className="text-white/60 text-xs">
                      {r.venueIds.length} venues
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString()}` : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3">
                    <button
                      className="px-2 py-1 rounded-md text-[12px] bg-white/10 text-white/85 hover:bg-white/15 disabled:opacity-60"
                      disabled={busyId === r.id}
                      onClick={() => onApply(r.venueIds, { id: r.id, name: r.name })}
                    >
                      Apply
                    </button>
                    <button
                      className="px-2 py-1 rounded-md text-[12px] bg-white/10 text-white/85 hover:bg-white/15 disabled:opacity-60"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        const next = window.prompt('Rename shortlist:', r.name)?.trim()
                        if (!next || next === r.name) return
                        setBusyId(r.id)
                        try {
                          await renameShortlist(r.id, next)
                          setRows(prev => prev?.map(x => x.id===r.id ? { ...x, name: next } : x) ?? null)
                        } finally { setBusyId(null) }
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="px-2 py-1 rounded-md text-[12px] bg-red-500/20 text-red-100 hover:bg-red-500/30 disabled:opacity-60"
                      disabled={busyId === r.id}
                      onClick={async () => {
                        const yes = window.confirm(`Delete "${r.name}"? This cannot be undone.`)
                        if (!yes) return
                        setBusyId(r.id)
                        try {
                          await deleteShortlist(r.id)
                          setRows(prev => prev?.filter(x => x.id !== r.id) ?? null)
                        } finally { setBusyId(null) }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}