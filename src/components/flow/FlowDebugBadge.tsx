import React from 'react'

export function FlowDebugBadge({ zoom, res, lastMs }: { zoom: number; res: number; lastMs?: number }) {
  if (import.meta.env.PROD) return null
  return (
    <div className="fixed bottom-[calc(12px+env(safe-area-inset-bottom))] right-3 z-[9999]
                    rounded-lg bg-black/70 text-white/85 px-2.5 py-1.5 text-[11px] font-medium
                    shadow-lg backdrop-blur">
      z{Math.round(zoom * 10) / 10} · r{res}{lastMs != null ? ` · ${lastMs}ms` : ''}
    </div>
  )
}