import * as React from 'react'
import { cn } from '@/lib/utils'
import { Chip } from '@/components/ui/Chip'
import { openTransitFirstOrRideshare } from '@/lib/geo/openNativeDirections'
import { useFlowMetrics } from '@/contexts/FlowMetricsContext'

type Props = {
  flowPct?: number | null            // 0..100 (optional, falls back to context)
  syncPct?: number | null            // 0..100 (optional, falls back to context)
  elapsedMin?: number | null         // optional ⏱ (falls back to context)
  sui01?: number | null              // optional 0..1 ☀ (falls back to context)
  onRoute?: () => void
  onToggleHeatline?: (next: boolean | ((v: boolean) => boolean)) => void
  className?: string
  venue?: { lat: number | null; lng: number | null; name: string } | null
  heatlineOn?: boolean
}

// Safe helpers for formatting
const pct = (n?: number | null) => (n == null || !Number.isFinite(n) ? '–' : `${Math.max(0, Math.min(100, Math.round(n)))}%`)
const minText = (n?: number | null) => (n == null || !Number.isFinite(n) ? '–' : `${Math.max(0, Math.floor(n))}m`)

export const VenueActionBar = React.memo(function VenueActionBar({
  flowPct: propFlowPct, 
  syncPct: propSyncPct, 
  elapsedMin: propElapsedMin, 
  sui01: propSui01, 
  onRoute, 
  onToggleHeatline, 
  className, 
  venue, 
  heatlineOn
}: Props) {
  const metrics = useFlowMetrics()
  const flowPct = propFlowPct ?? metrics.flowPct
  const syncPct = propSyncPct ?? metrics.syncPct
  const elapsedMin = propElapsedMin ?? metrics.elapsedMin
  const sui01 = propSui01 ?? metrics.sui01

  const handleRoute = React.useCallback(() => {
    const hasCoords = venue && Number.isFinite(venue.lat) && Number.isFinite(venue.lng)
    if (hasCoords) {
      openTransitFirstOrRideshare({ 
        dest: { lat: venue!.lat!, lng: venue!.lng! }, 
        label: venue!.name 
      })
    }
    onRoute?.()
  }, [venue, onRoute])
  return (
    <div className={cn("flex items-center gap-2 w-full", className)}>
      <button 
        type="button" 
        onClick={handleRoute}
        className="rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
        aria-label={venue?.name ? `Route to ${venue.name}` : 'Route'}
      >
        ➜ Route
      </button>

      <div className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs">
        <span className="font-medium">Flow</span>
        <span className="tabular-nums">{pct(flowPct)}</span>
      </div>

      <div className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs">
        <span className="font-medium">Sync</span>
        <span className="tabular-nums">{pct(syncPct)}</span>
      </div>

      <div className="flex-1" />

      {elapsedMin != null && (
        <span className="text-xs text-foreground/80 tabular-nums">⏱ {minText(elapsedMin)}</span>
      )}
      {sui01 != null && (
        <span className="text-xs text-foreground/80 tabular-nums">☀ {pct((sui01 ?? 0) * 100)}</span>
      )}

      {onToggleHeatline && (
        <button
          type="button"
          onClick={() => onToggleHeatline(v => typeof v === 'boolean' ? !v : true)}
          aria-pressed={!!heatlineOn}
          aria-label={heatlineOn ? 'Turn heatline off' : 'Turn heatline on'}
          title={heatlineOn ? 'Heatline: On' : 'Heatline: Off'}
          className="ml-2 rounded-full bg-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/30 transition-colors"
        >
          {heatlineOn ? 'Heatline: On' : 'Heatline: Off'}
        </button>
      )}
    </div>
  )
})