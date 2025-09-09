import React from 'react'

export function TemporalConfidenceHUD({ 
  confidence, 
  horizonLabel 
}: { 
  confidence?: number
  horizonLabel?: string 
}) {
  if (confidence == null) return null
  
  const c = Math.max(0, Math.min(1, confidence))
  const label = c >= 0.75 ? 'High confidence' : c >= 0.45 ? 'Medium confidence' : 'Low confidence'
  const color = c >= 0.75 ? '#34d399' : c >= 0.45 ? '#f59e0b' : '#ef4444' // green/amber/red

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
      style={{ 
        background: 'rgba(255,255,255,0.08)', 
        border: '1px solid rgba(255,255,255,0.18)' 
      }}
      aria-label="Forecast confidence"
    >
      <span 
        aria-hidden 
        className="w-2 h-2 rounded-full" 
        style={{ background: color }} 
      />
      <span className="text-white/90">
        {label}{horizonLabel ? ` · ${horizonLabel}` : ''}
      </span>
    </span>
  )
}