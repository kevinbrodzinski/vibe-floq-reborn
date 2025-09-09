import React from 'react'
import { cn } from '@/lib/utils'

export function FlowHUD({ elapsedMin, sui01, className }: {
  elapsedMin: number
  sui01: number
  className?: string
}) {
  const suiPct = Math.round(sui01 * 100)
  const min = Math.max(0, Math.floor(elapsedMin))
  return (
    <div className={cn("fixed top-16 right-4 z-[560] rounded-xl px-3 py-2 bg-black/40 text-white text-xs backdrop-blur", className)}>
      <div>⏱ {min} min</div>
      <div>☀️ SUI {suiPct}%</div>
    </div>
  )
}