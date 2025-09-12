import * as React from 'react'
import { useFlowRecorder } from '@/hooks/useFlowRecorder'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function RecorderControlsFab({ className }: Props) {
  const recorder = useFlowRecorder()
  const state = recorder.state

  const isRec = state === 'recording'
  const isPause = state === 'paused'
  const canStart = state === 'idle' || state === 'ended'

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {canStart ? (
        <button
          type="button"
          onClick={() => recorder.start()}
          className="px-3 py-2 rounded-full bg-green-500 text-white shadow-md hover:bg-green-600 text-xs font-semibold"
          aria-label="Start Flow"
        >
          ▶ Start
        </button>
      ) : (
        <>
          {isRec && (
            <button
              type="button"
              onClick={() => recorder.pause()}
              className="px-3 py-2 rounded-full bg-white/10 text-white shadow hover:bg-white/15 text-xs"
              aria-label="Pause Flow"
            >
              ⏸ Pause
            </button>
          )}
          {isPause && (
            <button
              type="button"
              onClick={() => recorder.resume()}
              className="px-3 py-2 rounded-full bg-white/10 text-white shadow hover:bg-white/15 text-xs"
              aria-label="Resume Flow"
            >
              ▶ Resume
            </button>
          )}
          <button
            type="button"
            onClick={() => recorder.stop()}
            className="px-3 py-2 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 text-xs"
            aria-label="Stop Flow"
          >
            ■ Stop
          </button>
        </>
      )}
    </div>
  )
}