import * as React from 'react'
import { cn } from '@/lib/utils'
import { openTransitFirstOrRideshare } from '@/lib/directions/native'

type Props = {
  flowPct?: number | null
  syncPct?: number | null
  elapsedMin?: number | null
  sui01?: number | null
  onRoute?: () => void
  onToggleHeatline?: (next: boolean | ((v: boolean) => boolean)) => void
  heatlineOn?: boolean
  className?: string
  venue?: { lat: number | null; lng: number | null; name: string } | null
}

const pct = (n?: number | null) =>
  n == null || !Number.isFinite(n) ? '–' : `${Math.max(0, Math.min(100, Math.round(n)))}%`
const minText = (n?: number | null) =>
  n == null || !Number.isFinite(n) ? '–' : `${Math.max(0, Math.floor(n))}m`

export const VenueActionBar = React.memo(function VenueActionBar({
  flowPct, syncPct, elapsedMin, sui01, onRoute, onToggleHeatline, heatlineOn, className, venue,
}: Props) {
  const handleRoute = React.useCallback(() => {
    const hasCoords = venue && Number.isFinite(venue.lat) && Number.isFinite(venue.lng)
    if (hasCoords) {
      openTransitFirstOrRideshare({ dest: { lat: venue!.lat!, lng: venue!.lng! }, label: venue!.name })
    }
    onRoute?.()
  }, [venue, onRoute])

  return (
    <div className={cn('flex items-center gap-2 w-full', className)}>
      {/* Route CTA */}
      <button
        type="button"
        onClick={handleRoute}
        className="rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
        aria-label={venue?.name ? `Route to ${venue.name}` : 'Route'}
      >
        ➜ Route
      </button>

      {/* Flow */}
      <div className="ml-2 inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs">
        <span className="font-medium">Flow</span>
        <span>{pct(flowPct)}</span>
      </div>

      {/* Sync */}
      <div className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs">
        <span className="font-medium">Sync</span>
        <span>{pct(syncPct)}</span>
      </div>

      <div className="flex-1" />

      {/* Mini HUD chips */}
      {elapsedMin != null && <span className="text-xs text-foreground/80">⏱ {minText(elapsedMin)}</span>}
      {sui01 != null && <span className="text-xs text-foreground/80">☀ {pct((sui01 ?? 0) * 100)}</span>}

      {/* Heatline toggle */}
      {onToggleHeatline && (
        <button
          type="button"
          onClick={() => onToggleHeatline(v => (typeof v === 'boolean' ? !v : true))}
          aria-pressed={!!heatlineOn}
          aria-label={heatlineOn ? 'Turn heatline off' : 'Turn heatline on'}
          title={heatlineOn ? 'Heatline: On' : 'Heatline: Off'}
          className="ml-2 rounded-full bg-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/30"
        >
          {heatlineOn ? 'Heatline: On' : 'Heatline: Off'}
        </button>
      )}
    </div>
  )
})