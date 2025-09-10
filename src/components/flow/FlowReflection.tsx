import React from 'react'
import { cn } from '@/lib/utils'

type SegmentLite = {
  arrived_at: string
  departed_at?: string
  center: { lng:number; lat:number }
  exposure_fraction?: number
  vibe_vector?: { energy?: number; valence?: number }
}

export type FlowReflectionProps = {
  flowId: string
  startedAt: string
  endedAt?: string
  sunExposedMin?: number // from DB (flows.sun_exposed_min) if available
  segments: SegmentLite[]
  aiSummary?: string | null      // optional: precomputed server-side
  onShare?: () => void           // hook up later (postcard/share)
  className?: string
}

function haversineM(a:{lng:number;lat:number}, b:{lng:number;lat:number}) {
  const R=6371000, toRad=(x:number)=>x*Math.PI/180
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng)
  const s1=Math.sin(dLat/2)**2, s2=Math.sin(dLng/2)**2
  const c=2*Math.asin(Math.sqrt(s1+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2))
  return R*c
}

export default function FlowReflection({
  flowId, startedAt, endedAt, sunExposedMin, segments, aiSummary, onShare, className
}: FlowReflectionProps) {
  // Duration
  const start = new Date(startedAt).getTime()
  const end   = endedAt ? new Date(endedAt).getTime() : Date.now()
  const elapsedMin = Math.max(0, Math.round((end - start)/60000))

  // Distance
  let distM = 0
  for (let i=1;i<segments.length;i++){
    const a = segments[i-1].center, b = segments[i].center
    distM += haversineM(a,b)
  }
  const distKm = distM/1000

  // Vibe arc (simple: energy median across segments)
  const energies = segments.map(s => s.vibe_vector?.energy).filter((x):x is number => Number.isFinite(x))
  const energyMedian = energies.length
    ? energies.sort((a,b)=>a-b)[Math.floor(energies.length/2)]
    : undefined

  // SUI % (prefer DB value)
  const suiPct = sunExposedMin != null && elapsedMin > 0
    ? Math.round(100 * Math.min(1, Math.max(0, sunExposedMin/elapsedMin)))
    : undefined

  return (
    <div className={cn("w-full max-w-xl mx-auto rounded-2xl p-4 md:p-6 bg-white/5 border border-white/10 text-white", className)}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base md:text-lg font-semibold">Flow Reflection</h2>
        {onShare && (
          <button
            onClick={onShare}
            className="text-xs px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90"
          >
            Share
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Duration" value={`${elapsedMin} min`} />
        <Stat label="Distance" value={`${distKm.toFixed(2)} km`} />
        <Stat label="SUI" value={suiPct != null ? `${suiPct}%` : '—'} />
      </div>

      <div className="rounded-xl p-3 bg-white/3 border border-white/10 mb-4">
        <div className="text-xs text-white/70 mb-2">Vibe arc</div>
        {/* Tiny sparkline w/ CSS only (fallback) */}
        <div className="h-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300" />
          <div className="absolute inset-0">
            {/* Simple bars: energy drives height */}
            <div className="flex h-full items-end gap-0.5">
              {segments.slice(0,40).map((s,i) => {
                const e = s.vibe_vector?.energy ?? energyMedian ?? 0.5
                const h = Math.max(8, Math.min(100, Math.round(e*100)))
                return <div key={i} className="w-1 bg-white/60" style={{height:`${h}%`}} />
              })}
            </div>
          </div>
        </div>
        {energyMedian != null && (
          <div className="text-xs text-white/60 mt-2">Median energy: {(energyMedian*100|0)}%</div>
        )}
      </div>

      <div className="rounded-xl p-3 bg-white/3 border border-white/10">
        <div className="text-xs text-white/70 mb-2">AI summary</div>
        <div className="text-sm leading-relaxed">
          {aiSummary ?? '• Your reflection will appear here after we process your flow.'}
        </div>
      </div>

      <div className="text-[11px] text-white/50 mt-4">Flow ID: {flowId}</div>
    </div>
  )
}

function Stat({label, value}:{label:string; value:string}) {
  return (
    <div className="rounded-xl p-3 bg-white/3 border border-white/10">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  )
}