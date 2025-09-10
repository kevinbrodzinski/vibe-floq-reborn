import React from 'react'
import { cn } from '@/lib/utils'

export function FlowHUD({
  elapsedMin, sui01, className,
}: { elapsedMin: number; sui01: number; className?: string }) {
  const sui = Math.round(sui01 * 100)
  const mins = Math.max(0, Math.floor(elapsedMin))
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-4 top-16 z-[620] rounded-xl px-3 py-2 text-xs font-medium backdrop-blur bg-black/35 text-white',
        className
      )}
      aria-live="polite"
    >
      ⏱ {mins}m • ☀️ SUI {sui}%
    </div>
  )
}