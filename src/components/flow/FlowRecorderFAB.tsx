import React from 'react'
import { cn } from '@/lib/utils'

export function FlowRecorderFAB({
  state, onStart, onPause, onResume, onStop, className,
}: {
  state: 'idle'|'recording'|'paused'|'ended'
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  className?: string
}) {
  const isRec   = state === 'recording'
  const isPause = state === 'paused'

  return (
    <div className={cn('fixed right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[640]', className)}>
      {state === 'idle' || state === 'ended' ? (
        <button
          onClick={onStart}
          className="rounded-full px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur bg-white/10 text-white hover:bg-white/15"
        >
          ▶ Start Flow
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {isRec ? (
            <button onClick={onPause} className="rounded-full px-4 py-2 text-xs bg-white/10 text-white hover:bg-white/15">⏸ Pause</button>
          ) : isPause ? (
            <button onClick={onResume} className="rounded-full px-4 py-2 text-xs bg-white/10 text-white hover:bg-white/15">▶ Resume</button>
          ) : null}
          <button onClick={onStop} className="rounded-full px-4 py-2 text-xs bg-red-500/80 text-white hover:bg-red-500">■ Stop</button>
        </div>
      )}
    </div>
  )
}