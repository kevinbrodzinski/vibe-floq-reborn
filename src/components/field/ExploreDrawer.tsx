import React, { useState } from 'react'
import { getVibeToken } from '@/lib/tokens/vibeTokens'
import { useFlowMetrics } from '@/contexts/FlowMetricsContext'
import { useFlowRecorder } from '@/hooks/useFlowRecorder'

export type TileVenue = {
  pid: string
  name: string
  category?: string
  open_now?: boolean
  busy_band?: 0|1|2|3|4
}

type ExploreDrawerProps = {
  venues: TileVenue[]
  onJoin: (pid: string) => void
  onSave: (pid: string) => void
  onPlan: (pid: string) => void
  onChangeVenue: (pid: string) => void
  changeBtnRef?: React.RefObject<HTMLButtonElement>
}

export function ExploreDrawer({
  venues,
  onJoin,
  onSave,
  onPlan,
  onChangeVenue,
  changeBtnRef,
}: ExploreDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const t = getVibeToken('social' as any)
  const primary = venues?.[0]

  // Flow context hooks
  const metrics = useFlowMetrics()
  const recorder = useFlowRecorder()

  if (!primary) return null

  // Busy band -> label
  const band = (b?: number) =>
    b == null ? '' :
    b <= 1 ? 'Quiet' :
    b <= 2 ? 'Moderate' :
    b <= 3 ? 'Busy' : 'Very busy'

  // Format utilities (from VenueActionBar pattern)
  const pct = (n?: number | null) =>
    n == null || !Number.isFinite(n) ? '–' : `${Math.max(0, Math.min(100, Math.round(n)))}%`
  const minText = (n?: number | null) =>
    n == null || !Number.isFinite(n) ? '–' : `${Math.max(0, Math.floor(n))}m`

  const isRec = recorder.state === 'recording'
  const isPause = recorder.state === 'paused'
  const canStart = recorder.state === 'idle' || recorder.state === 'ended'

  return (
    <>
      {/* Tap-to-open pill */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed left-4 right-4 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-[420] px-4 py-3 rounded-2xl text-left backdrop-blur transition-all duration-200 hover:scale-[1.02]"
          style={{ background: t.bg, border: `1px solid ${t.ring}`, boxShadow: `0 0 24px ${t.glow}` }}
          aria-label={`Open details for ${primary.name}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-white/90 text-sm font-semibold truncate">{primary.name}</div>
              <div className="text-white/70 text-xs truncate">
                {primary.category ?? 'Venue'}{primary.open_now ? ' • Open' : ''}{primary.busy_band != null ? ` • ${band(primary.busy_band)}` : ''}
              </div>
            </div>
            <div className="text-green-300/90 text-xs">{primary.open_now ? 'LIVE' : ''}</div>
          </div>
        </button>
      )}

      {/* Bottom sheet */}
      {isExpanded && (
        <div
          className="fixed left-0 right-0 bottom-0 z-[600] px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] backdrop-blur"
          style={{ background:'rgba(12,16,26,0.9)', borderTop:'1px solid rgba(255,255,255,0.15)' }}
          role="dialog" aria-label="Explore nearby"
        >
          <div className="mx-auto max-w-[520px]">
            {/* Handle bar */}
            <div className="w-full flex items-center justify-center mb-3">
              <button
                onClick={() => setIsExpanded(false)}
                className="w-12 h-1 bg-white/30 rounded-full"
                aria-label="Collapse"
              />
            </div>

            {/* Primary venue card */}
            <div className="rounded-xl p-4 mb-3" style={{ background:t.bg, border:`1px solid ${t.ring}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white/90 text-sm font-semibold truncate">{primary.name}</div>
                  <div className="text-white/70 text-xs truncate">
                    {primary.category ?? 'Venue'}{primary.open_now ? ' • Open now' : ''}{primary.busy_band != null ? ` • ${band(primary.busy_band)}` : ''}
                  </div>
                </div>
                <div className="text-green-300/90 text-xs">{primary.open_now ? 'LIVE' : ''}</div>
              </div>

              {/* Flow Metrics */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs">
                  <span className="font-medium text-white/90">Flow</span>
                  <span className="text-white/80">{pct(metrics.flowPct)}</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs">
                  <span className="font-medium text-white/90">Sync</span>
                  <span className="text-white/80">{pct(metrics.syncPct)}</span>
                </div>
                {metrics.elapsedMin != null && (
                  <span className="text-xs text-white/70">⏱ {minText(metrics.elapsedMin)}</span>
                )}
                {metrics.sui01 != null && (
                  <span className="text-xs text-white/70">☀ {pct((metrics.sui01 ?? 0) * 100)}</span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {/* Flow Controls */}
                {canStart ? (
                  <button
                    onClick={() => recorder.start()}
                    className="px-3 py-2 rounded-md text-xs font-semibold bg-green-500/80 text-white hover:bg-green-500 transition-all duration-150"
                  >
                    ▶ Start Flow
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {isRec ? (
                      <button
                        onClick={recorder.pause}
                        className="px-3 py-2 rounded-md text-xs bg-white/10 text-white/85 hover:bg-white/15 transition-all duration-150"
                      >
                        ⏸ Pause
                      </button>
                    ) : isPause ? (
                      <button
                        onClick={recorder.resume}
                        className="px-3 py-2 rounded-md text-xs bg-white/10 text-white/85 hover:bg-white/15 transition-all duration-150"
                      >
                        ▶ Resume
                      </button>
                    ) : null}
                    <button
                      onClick={recorder.stop}
                      className="px-3 py-2 rounded-md text-xs bg-red-500/80 text-white hover:bg-red-500 transition-all duration-150"
                    >
                      ■ Stop
                    </button>
                  </div>
                )}

                {/* Venue Actions */}
                <button
                  onClick={() => onJoin(primary.pid)}
                  className="px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150 hover:scale-[1.03]"
                  style={{ background: t.base, color: t.fg }}
                >
                  Join
                </button>
                <button
                  onClick={() => onSave(primary.pid)}
                  className="px-3 py-2 rounded-md text-xs bg-white/10 text-white/85 hover:bg-white/15 transition-all duration-150"
                >
                  Save
                </button>
                <button
                  onClick={() => onPlan(primary.pid)}
                  className="px-3 py-2 rounded-md text-xs bg-white/10 text-white/85 hover:bg-white/15 transition-all duration-150"
                >
                  Plan
                </button>
                <button
                  ref={changeBtnRef}
                  onClick={() => onChangeVenue(primary.pid)}
                  className="ml-auto text-[11px] underline text-white/85 hover:text-white/95"
                >
                  Change venue
                </button>
              </div>
            </div>

            {/* Additional venues */}
            {venues.slice(1).length > 0 && (
              <div className="max-h-[40vh] overflow-y-auto">
                <div className="text-white/70 text-xs mb-2">More nearby venues</div>
                <div className="space-y-2">
                  {venues.slice(1, 6).map(v => (
                    <button
                      key={v.pid}
                      onClick={() => onJoin(v.pid)}
                      className="w-full rounded-lg px-3 py-2 text-left bg-white/5 border border-white/10 text-white/85 hover:bg-white/8 hover:border-white/20 transition-colors"
                      aria-label={`Open ${v.name}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm truncate">{v.name}</div>
                          <div className="text-xs text-white/70 truncate">
                            {v.category ?? 'Venue'}{v.open_now ? ' • Open' : ''}{v.busy_band != null ? ` • ${band(v.busy_band)}` : ''}
                          </div>
                        </div>
                        {v.busy_band && v.busy_band > 2 && (
                          <span className="text-[11px] text-orange-300/90">Busy</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {venues.length > 6 && (
                    <button
                      onClick={() => onChangeVenue(primary.pid)}
                      className="text-xs text-white/70 underline hover:text-white/90"
                      aria-label="See all venues"
                    >
                      See all {venues.length} venues
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}