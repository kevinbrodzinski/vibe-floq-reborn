import React from 'react'
import type { FlowFilters } from '@/lib/flow/types'

interface FlowExploreChipsProps {
  value: FlowFilters
  onChange: (filters: FlowFilters) => void
}

export function FlowExploreChips({ value, onChange }: FlowExploreChipsProps) {
  const set = (patch: Partial<FlowFilters>) => onChange({ ...value, ...patch })
  
  // NEW: cycle density
  const nextDensity = (d?: 'loose'|'normal'|'tight'): 'loose'|'normal'|'tight' =>
    d === 'loose' ? 'normal' : d === 'normal' ? 'tight' : 'loose'
  
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(64px+env(safe-area-inset-top))] z-[590] flex gap-2 px-4">
      <button
        onClick={() => set({ friendFlows: !value.friendFlows })}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          value.friendFlows 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        }`}
      >
        Friends
      </button>
      
      <button
        onClick={() => set({ queue: value.queue === 'short' ? 'any' : 'short' })}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          value.queue === 'short' 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        }`}
      >
        Short queue
      </button>
      
      <button
        onClick={() => set({ weatherPref: value.weatherPref?.[0] === 'sun' ? [] : ['sun'] })}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          value.weatherPref?.[0] === 'sun' 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        }`}
      >
        ☀️ Sun
      </button>
      
      <button
        onClick={() => set({ 
          vibeRange: value.vibeRange?.[0] === 0.6 ? undefined : [0.6, 1.0] 
        })}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          value.vibeRange?.[0] === 0.6 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        }`}
      >
        High energy
      </button>
      
      {/* NEW: Density chip */}
      <button
        onClick={() => set({ clusterDensity: nextDensity(value.clusterDensity) })}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          value.clusterDensity 
            ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm' 
            : 'bg-white/10 text-white/80 hover:bg-white/15'
        }`}
        aria-label="Convergence density"
        title="Convergence density"
      >
        Density: {value.clusterDensity ?? 'normal'}
      </button>
    </div>
  )
}