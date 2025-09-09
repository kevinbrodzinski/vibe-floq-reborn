import React from 'react'

export function FlowHUD({
  state, segments, sunScore
}: {
  state: 'idle'|'recording'|'paused'|'ended',
  segments: any[],
  sunScore?: number | null
}) {
  if (state === 'idle' || state === 'ended') return null
  const elapsed = segments.length
  return (
    <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2
                    z-[590] rounded-xl bg-black/70 text-white px-3 py-2 text-xs font-medium
                    shadow-lg backdrop-blur flex items-center gap-3">
      <span>{state === 'recording' ? '● REC' : 'II PAUSED'}</span>
      <span>segments: {elapsed}</span>
      {typeof sunScore === 'number' && <span>sun: {Math.round(sunScore*100)}%</span>}
    </div>
  )
}