import * as React from 'react'
import { cn } from '@/lib/utils'
import { Chip } from '@/components/ui/Chip'
import { openTransitFirstOrRideshare } from '@/lib/geo/openNativeDirections'
import { useFlowMetrics } from '@/contexts/FlowMetricsContext'

type Props = {
  flowPct?: number            // 0..100 (optional, falls back to context)
  syncPct?: number            // 0..100 (optional, falls back to context)
  elapsedMin?: number         // optional ⏱ (falls back to context)
  sui01?: number              // optional 0..1 ☀ (falls back to context)
  onRoute: () => void
  onToggleHeatline?: (next: boolean | ((v: boolean) => boolean)) => void
  className?: string
  venue?: { lat: number | null; lng: number | null; name: string } | null
}

export function VenueActionBar(props: Props) {
  const metrics = useFlowMetrics()
  const flowPct = props.flowPct ?? metrics.flowPct
  const syncPct = props.syncPct ?? metrics.syncPct
  const elapsedMin = props.elapsedMin ?? metrics.elapsedMin
  const sui01 = props.sui01 ?? metrics.sui01
  const { onRoute, onToggleHeatline, className, venue } = props
  const sui = typeof sui01 === 'number' ? Math.round(sui01 * 100) : null
  const mins = typeof elapsedMin === 'number' ? Math.max(0, Math.floor(elapsedMin)) : null

  const handleRoute = () => {
    if (venue?.lat && venue?.lng) {
      openTransitFirstOrRideshare({ 
        dest: { lat: venue.lat, lng: venue.lng }, 
        label: venue.name 
      });
    }
    onRoute();
  };

  return (
    <div className={cn(
      'mt-3 flex flex-wrap items-center gap-3 md:gap-4',
      'text-foreground/90', className
    )}>
      {/* Route CTA */}
      <button
        onClick={handleRoute}
        className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/30 transition-colors"
        aria-label="Route to this venue"
      >
        <span aria-hidden>➜</span>
        <span>Route</span>
      </button>

      {/* Flow (momentum) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Flow</span>
        <div
          className="w-20 md:w-28 h-2 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={flowPct}
          aria-label="Flow momentum"
          title={`${flowPct}%`}
        >
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${flowPct}%` }} 
          />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{flowPct}%</span>
      </div>

      {/* Sync (cohesion) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sync</span>
        <span className="text-sm font-semibold tabular-nums">{syncPct}%</span>
      </div>

      {/* Spacer pushes chips to the right on wide layouts */}
      <div className="grow" />

      {/* Optional mini HUD chips (⏱, ☀) */}
      {mins != null && (
        <Chip 
          color="slate" 
          className="px-2 py-1 text-xs" 
          aria-label={`Elapsed time ${mins} minutes`}
        >
          ⏱ {mins}m
        </Chip>
      )}
      {sui != null && (
        <Chip 
          color="yellow" 
          className="px-2 py-1 text-xs" 
          aria-label={`Sun score ${sui}%`}
        >
          ☀ {sui}%
        </Chip>
      )}

      {/* Heatline toggle */}
      {onToggleHeatline && (
        <button
          onClick={() => onToggleHeatline((v: boolean) => !v)}
          className="rounded-full bg-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/30 transition-colors"
          aria-label="Toggle Heatline"
        >
          Heatline
        </button>
      )}
    </div>
  )
}