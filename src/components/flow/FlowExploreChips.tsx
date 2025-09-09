import React from 'react'
import type { FlowFilters } from '@/lib/flow/types'

interface FlowExploreChipsProps {
  value: FlowFilters
  onChange: (filters: FlowFilters) => void
  /** NEW: current H3 resolution for display/debug */
  clusterRes?: number
  /** Loading state for visual feedback */
  loading?: boolean
}

export function FlowExploreChips({ value, onChange, clusterRes, loading = false }: FlowExploreChipsProps) {
  const set = (patch: Partial<FlowFilters>) => onChange({ ...value, ...patch })
  
  // cycle loose→normal→tight
  const nextDensity = (d?: 'loose'|'normal'|'tight'): 'loose'|'normal'|'tight' =>
    d === 'loose' ? 'normal' : d === 'normal' ? 'tight' : 'loose'

  // simple tooltip for the density chip
  const Tip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap
                     rounded-md bg-black/80 px-2 py-1 text-[11px] text-white shadow-lg opacity-0
                     group-hover:opacity-100 transition-opacity">
      {children}
    </span>
  )
  
  const chipBaseClass = `px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
    loading ? 'animate-pulse' : ''
  }`

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(64px+env(safe-area-inset-top))] z-[590] 
                    flex flex-wrap gap-2 px-4 max-w-[calc(100vw-32px)] justify-center">{loading && (
        <div className="absolute inset-0 bg-white/5 rounded-full animate-pulse" />
      )}
      <button
        onClick={() => set({ friendFlows: !value.friendFlows })}
        disabled={loading}
        className={`${chipBaseClass} ${
          value.friendFlows 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        } disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        Friends
      </button>
      
      <button
        onClick={() => set({ queue: value.queue === 'short' ? 'any' : 'short' })}
        disabled={loading}
        className={`${chipBaseClass} ${
          value.queue === 'short' 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        } disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        Short queue
      </button>
      
      <button
        onClick={() => set({ weatherPref: value.weatherPref?.[0] === 'sun' ? [] : ['sun'] })}
        disabled={loading}
        className={`${chipBaseClass} ${
          value.weatherPref?.[0] === 'sun' 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        } disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        ☀️ Sun
      </button>
      
      <button
        onClick={() => set({ 
          vibeRange: value.vibeRange?.[0] === 0.6 ? undefined : [0.6, 1.0] 
        })}
        disabled={loading}
        className={`${chipBaseClass} ${
          value.vibeRange?.[0] === 0.6 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        } disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
      >
        High energy
      </button>
      
      {/* NEW: Density chip with tooltip + res readout */}
      <div className="relative group">
        <button
          onClick={() => set({ clusterDensity: nextDensity(value.clusterDensity) })}
          disabled={loading}
          className={`${chipBaseClass} ${
            value.clusterDensity 
              ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
              : 'bg-white/10 text-white/80 hover:bg-white/15'
          } disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation`}
          aria-label="Convergence density"
          title="Convergence density"
        >
          Density: {value.clusterDensity ?? 'normal'}{clusterRes != null ? ` (r${clusterRes})` : ''}
        </button>
        <Tip>
          Tight = smaller H3 cells (more precise). Loose = larger cells (broader view).<br/>
          r{clusterRes ?? '–'} ≈ cell size {clusterRes != null ? (clusterRes >= 10 ? '~150m' : clusterRes === 9 ? '~300m' : '~600m') : 'depends on zoom'}.
        </Tip>
      </div>
    </div>
  )
}