import React from 'react'

export function ShareHint({
  open,
  onOpenShare,
  captionPreview = 'Perfect convergence in ~5m'
}: { open: boolean; onOpenShare: () => void; captionPreview?: string }) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-label="Share this moment"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[630] bg-black/55 backdrop-blur px-4 py-3 rounded-xl flex items-center gap-3"
      style={{ border: '1px solid rgba(255,255,255,0.24)' }}
    >
      <div className="text-white/90 text-sm">Share this moment</div>
      <div className="text-white/70 text-xs max-w-[220px] truncate">{captionPreview}</div>
      <button
        aria-label="Open Share"
        onClick={onOpenShare}
        className="px-3 py-2 rounded-md bg-white/20 text-white hover:bg-white/30 text-sm"
      >
        Open Share
      </button>
    </div>
  )
}