import React from 'react'
import { useFieldLens } from './FieldLensProvider'

export function LensStatusHUD({ insight }: { insight?: string }) {
  const { lens } = useFieldLens()
  const label = lens === 'explore' ? 'Explore' : lens === 'constellation' ? 'Constellation' : 'Temporal'
  return (
    <div className="fixed left-6 top-6 z-[560] px-3 py-2 rounded-md bg-black/35 backdrop-blur text-white/90 text-xs">
      <b>{label}</b>{insight ? ` • ${insight}` : ''}
    </div>
  )
}