import React from 'react'
import { useFieldLens } from './FieldLensProvider'

export function LensStatusHUD({ insight }: { insight?: string }) {
  const { lens } = useFieldLens()
  const label = lens === 'explore' ? 'Explore' : lens === 'constellation' ? 'Constellation' : 'Temporal'
  
  // Don't show if no insight to display
  if (!insight) return null;
  
  return (
    <div className="fixed left-6 top-[calc(120px+env(safe-area-inset-top))] z-[560] px-3 py-2 rounded-md bg-black/35 backdrop-blur text-white/90 text-xs pointer-events-none">
      <b>{label}</b> • {insight}
    </div>
  )
}