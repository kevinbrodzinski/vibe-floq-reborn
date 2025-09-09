import React from 'react'
import type { FlowFilters } from '@/lib/flow/types'

interface Props {
  value: FlowFilters
  onChange: (filters: FlowFilters) => void
  clusterRes?: number
  loading?: boolean
}

export function FlowExploreChips({ value, onChange, clusterRes, loading }: Props) {
  const set = (patch: Partial<FlowFilters>) => onChange({ ...value, ...patch })
  const nextDensity = (d?: 'loose'|'normal'|'tight'): 'loose'|'normal'|'tight' =>
    d === 'loose' ? 'normal' : d === 'normal' ? 'tight' : 'loose'

  const chipBase = `px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${loading ? 'animate-pulse' : ''}`

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(64px+env(safe-area-inset-top))] z-[590] flex gap-2">
      <button
        onClick={() => set({ friendFlows: !value.friendFlows })}
        disabled={loading}
        className={`${chipBase} ${value.friendFlows ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' : 'bg-white/10 text-white/80 hover:bg-white/15'} disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        Friends
      </button>

      <button
        onClick={() => set({ queue: value.queue === 'short' ? 'any' : 'short' })}
        disabled={loading}
        className={`${chipBase} ${value.queue === 'short' ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' : 'bg-white/10 text-white/80 hover:bg-white/15'} disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        Short queue
      </button>

      <button
        onClick={() => set({ weatherPref: value.weatherPref?.[0] === 'sun' ? [] : ['sun'] })}
        disabled={loading}
        className={`${chipBase} ${value.weatherPref?.[0] === 'sun' ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' : 'bg-white/10 text-white/80 hover:bg-white/15'} disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        ☀️ Sun
      </button>

      <button
        onClick={() => set({ vibeRange: value.vibeRange?.[0] === 0.6 ? undefined : [0.6, 1.0] })}
        disabled={loading}
        className={`${chipBase} ${value.vibeRange?.[0] === 0.6 ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' : 'bg-white/10 text-white/80 hover:bg-white/15'} disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        High energy
      </button>

      <button
        onClick={() => set({ clusterDensity: nextDensity(value.clusterDensity) })}
        disabled={loading}
        className={`${chipBase} ${value.clusterDensity ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' : 'bg-white/10 text-white/80 hover:bg-white/15'} disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
        aria-label="Convergence density"
        title="Convergence density"
      >
        Density: {value.clusterDensity ?? 'normal'}{clusterRes != null ? ` (r${clusterRes})` : ''}
      </button>
    </div>
  )
}