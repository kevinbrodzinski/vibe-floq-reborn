// Enhanced Flow HUD with vibe confidence display
import React from 'react'
import { cn } from '@/lib/utils'
import { useVibeNow } from '@/hooks/useVibeNow'

interface EnhancedFlowHUDProps {
  elapsedMin: number
  sui01: number
  className?: string
}

export function EnhancedFlowHUD({ elapsedMin, sui01, className }: EnhancedFlowHUDProps) {
  const sui = Math.round(sui01 * 100)
  const mins = Math.max(0, Math.floor(elapsedMin))
  
  const { currentVibe, isEnabled } = useVibeNow()
  const energy = currentVibe ? Math.round(currentVibe.energy * 100) : null
  const confidence = currentVibe ? Math.round(currentVibe.confidence * 100) : null
  
  const confidenceLabel = confidence && confidence >= 70 ? 'High' : 
                         confidence && confidence >= 40 ? 'Medium' : 'Low'
  
  return (
    <div
      className={cn(
        'pointer-events-none fixed left-4 top-16 z-[620] rounded-xl px-3 py-2 text-xs font-medium backdrop-blur bg-black/35 text-white',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <span>☀</span>
          <span>{sui}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span>⏱</span>
          <span>{mins}m</span>
        </div>
        
        {/* Vibe Engine Display */}
        {isEnabled && energy !== null && (
          <>
            <div className="flex items-center gap-1 border-l border-white/20 pl-3">
              <span>🧠</span>
              <span>{energy}%</span>
            </div>
            {confidence !== null && confidence > 0 && (
              <div className="flex items-center gap-1 text-xs opacity-75">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  confidence >= 70 ? 'bg-green-400' :
                  confidence >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                )} />
                <span>{confidenceLabel}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}