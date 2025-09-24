import React from 'react'
import type { FlowFilters } from '@/lib/flow/types'

interface Props {
  value: FlowFilters
  onChange: (filters: FlowFilters) => void
  clusterRes?: number
  loading?: boolean
  /** 0..1 sun opportunity */
  sunScore?: number
}

export function FlowExploreChips({ value, onChange, clusterRes, loading, sunScore }: Props) {
  const set = (patch: Partial<FlowFilters>) => onChange({ ...value, ...patch })
  const nextDensity = (d?: 'loose'|'normal'|'tight'): 'loose'|'normal'|'tight' =>
    d === 'loose' ? 'normal' : d === 'normal' ? 'tight' : 'loose'

  return (
    <div className="fixed left-0 right-0 top-[calc(64px+env(safe-area-inset-top))] z-[590]">
      <div className="mx-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-fit bg-[color:var(--bg-alt)]/80 backdrop-blur-sm border border-[color:var(--border)] rounded-kit-lg px-3 py-2">
          <button
            onClick={() => set({ friendFlows: !value.friendFlows })}
            aria-pressed={!!value.friendFlows}
            disabled={loading}
            className={`px-3 py-1.5 rounded-kit-pill text-xs font-medium transition-all duration-200 shrink-0 touch-manipulation ${
              loading ? 'animate-pulse' : ''
            } ${value.friendFlows 
                ? 'bg-white/25 text-[color:var(--ink)] shadow-soft backdrop-blur-sm' 
                : 'bg-[color:var(--chip-bg)] text-[color:var(--chip-ink)] hover:bg-white/15'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            Friends
          </button>

          <button
            onClick={() => set({ queue: value.queue === 'short' ? 'any' : 'short' })}
            aria-pressed={value.queue === 'short'}
            disabled={loading}
            className={`px-3 py-1.5 rounded-kit-pill text-xs font-medium transition-all duration-200 shrink-0 touch-manipulation ${
              loading ? 'animate-pulse' : ''
            } ${value.queue === 'short'
                ? 'bg-white/25 text-[color:var(--ink)] shadow-soft backdrop-blur-sm' 
                : 'bg-[color:var(--chip-bg)] text-[color:var(--chip-ink)] hover:bg-white/15'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            Short queue
          </button>

          <button
            onClick={() => set({ weatherPref: value.weatherPref?.[0] === 'sun' ? [] : ['sun'] })}
            aria-pressed={value.weatherPref?.[0] === 'sun'}
            disabled={loading}
            className={`px-3 py-1.5 rounded-kit-pill text-xs font-medium transition-all duration-200 shrink-0 touch-manipulation ${
              loading ? 'animate-pulse' : ''
            } ${value.weatherPref?.[0] === 'sun'
                ? 'bg-white/25 text-[color:var(--ink)] shadow-soft backdrop-blur-sm' 
                : 'bg-[color:var(--chip-bg)] text-[color:var(--chip-ink)] hover:bg-white/15'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            ☀️ Sun{typeof sunScore === 'number' ? ` · ${Math.round(sunScore*100)}%` : ''}
          </button>

          <button
            onClick={() => set({ vibeRange: value.vibeRange?.[0] === 0.6 ? undefined : [0.6, 1.0] })}
            aria-pressed={value.vibeRange?.[0] === 0.6}
            disabled={loading}
            className={`px-3 py-1.5 rounded-kit-pill text-xs font-medium transition-all duration-200 shrink-0 touch-manipulation ${
              loading ? 'animate-pulse' : ''
            } ${value.vibeRange?.[0] === 0.6
                ? 'bg-white/25 text-[color:var(--ink)] shadow-soft backdrop-blur-sm' 
                : 'bg-[color:var(--chip-bg)] text-[color:var(--chip-ink)] hover:bg-white/15'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            High energy
          </button>

          <button
            onClick={() => set({ clusterDensity: nextDensity(value.clusterDensity) })}
            aria-pressed={!!value.clusterDensity}
            disabled={loading}
            className={`px-3 py-1.5 rounded-kit-pill text-xs font-medium transition-all duration-200 shrink-0 touch-manipulation ${
              loading ? 'animate-pulse' : ''
            } ${value.clusterDensity
                ? 'bg-white/25 text-[color:var(--ink)] shadow-soft backdrop-blur-sm' 
                : 'bg-[color:var(--chip-bg)] text-[color:var(--chip-ink)] hover:bg-white/15'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
            aria-label="Convergence density"
            title="Convergence density"
          >
            Density: {value.clusterDensity ?? 'normal'}{clusterRes != null ? ` (r${clusterRes})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}