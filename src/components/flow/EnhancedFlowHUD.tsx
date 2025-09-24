// Enhanced Flow HUD with vibe confidence display
import React from 'react'
import { cn } from '@/lib/utils'
import { useVibeNow } from '@/hooks/useVibeNow'
import { useEnvPermissions } from '@/lib/vibe/permissions/useEnvPermissions'
import { ImproveAccuracyChip } from '@/components/vibe/ImproveAccuracyChip'

interface EnhancedFlowHUDProps {
  elapsedMin: number
  sui01: number
  className?: string
}

export function EnhancedFlowHUD({ elapsedMin, sui01, className }: EnhancedFlowHUDProps) {
  const sui = Math.round(sui01 * 100)
  const mins = Math.max(0, Math.floor(elapsedMin))
  
  const { currentVibe, isEnabled } = useVibeNow()
  const { envEnabled, requestEnvPermissions } = useEnvPermissions()
  
  const energy = currentVibe ? Math.round(currentVibe.energy * 100) : null
  const confidence = currentVibe ? Math.round(currentVibe.confidence * 100) : null
  
  const confidenceLabel = confidence && confidence >= 70 ? 'High' : 
                         confidence && confidence >= 40 ? 'Medium' : 'Low'

  // Session-based dismissal for improve accuracy chip
  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('floq:vibe:envPromptDismissed') === '1';
  });

  const showImproveChip = !dismissed && !envEnabled && (confidence !== null && confidence < 55);
  
  return (
    <div
      className={cn(
        'pointer-events-auto fixed left-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[620]',
        'rounded-xl border border-border/60 bg-card/75 backdrop-blur-md',
        'px-3 py-2 flex flex-col gap-2',
        className
      )}
      role="group"
      aria-label="Flow status"
    >
      {/* Main HUD */}
      <div className="flex items-center gap-4 text-xs font-medium text-white">
        <div className="flex items-center gap-1">
          <span aria-hidden>☀</span>
          <span className="tabular-nums">{sui}%</span>
          <span className="sr-only">Sun utilization {sui}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span aria-hidden>⏱</span>
          <span className="tabular-nums">{mins}m</span>
          <span className="sr-only">Elapsed {mins} minutes</span>
        </div>
        
        {/* Vibe Engine Display */}
        {isEnabled && energy !== null && (
          <>
            <div className="flex items-center gap-1 border-l border-white/20 pl-3">
              <span aria-hidden>🧠</span>
              <span className="tabular-nums">{energy}%</span>
              <span className="sr-only">Energy {energy}%</span>
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

      {/* Improve Accuracy Chip */}
      {showImproveChip && (
        <ImproveAccuracyChip
          show={true}
          request={requestEnvPermissions}
          onRequested={({ motionOk, micOk }) => {
            const ok = motionOk || micOk;
            setDismissed(true);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('floq:vibe:envPromptDismissed', '1');
            }
            // Optional: toast feedback here
          }}
          className="text-xs"
        />
      )}
    </div>
  )
}