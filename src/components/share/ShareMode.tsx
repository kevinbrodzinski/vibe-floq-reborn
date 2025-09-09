import React from 'react'
import { captureOverlaysToPNG } from '@/lib/share/capture'
import { getCurrentMap } from '@/lib/geo/mapSingleton'

export function ShareMode({
  defaultCaption = 'Magic brewing in the city',
  branding = 'floq'
}: { defaultCaption?: string; branding?: string }) {
  const [open, setOpen] = React.useState(false)
  const [caption, setCaption] = React.useState(defaultCaption)
  const [busy, setBusy] = React.useState(false)

  const doCapture = async () => {
    try {
      setBusy(true)
      const map = getCurrentMap()
      const blob = await captureOverlaysToPNG({
        caption,
        branding,
        mapCanvas: map?.getCanvas?.()
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'floq-share.png'; a.click()
      URL.revokeObjectURL(url)
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed right-6 bottom-6 z-[620] px-4 py-3 rounded-lg bg-black/40 text-white/90 backdrop-blur"
      >
        Share
      </button>
    )
  }

  return (
    <div className="fixed right-6 bottom-6 z-[620] flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-3 rounded-lg">
      <input
        value={caption}
        onChange={e=>setCaption(e.target.value)}
        placeholder="Add a caption…"
        className="bg-black/30 text-white/90 px-2 py-1 rounded-md text-sm w-72 outline-none"
      />
      <button
        disabled={busy}
        onClick={doCapture}
        className="px-3 py-2 rounded-md bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
      >
        {busy ? 'Capturing…' : 'Save PNG'}
      </button>
      <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-md bg-white/10 text-white/80">Close</button>
    </div>
  )
}