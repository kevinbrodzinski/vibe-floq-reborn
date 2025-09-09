import React from 'react'
import { getVibeToken } from '@/lib/tokens/vibeTokens'
import type { Vibe } from '@/lib/vibes'
import type { InviteKind, InviteOption } from '@/lib/social/inviteEngine'

/** Types kept local to avoid deep imports — map them to your actual types as needed */
export type VenueLite = { id: string; name: string; loc?: { lng:number; lat:number }; photoUrl?: string | null }

/** Props */
export function InvitePopoverBody({
  top,                         // top-ranked InviteOption (decorated)
  confidence,                  // 0..1 forecast confidence (optional)
  horizonLabel,                // 'Now' | '+30m' | '+2h' etc.
  currentVibe = 'social',
  onPrimary,                   // handle main CTA by kind
  onChangeVenue,               // open venue chooser
}: {
  top: InviteOption
  confidence?: number
  horizonLabel?: string
  currentVibe?: string
  onPrimary: (opt: InviteOption) => void
  onChangeVenue?: () => void
}) {
  const t = getVibeToken(currentVibe as Vibe)
  const venueName = (top.payload?.venueName as string) || undefined
  const distM = (top.payload?.venueDistM as number) || undefined
  const walkText = distM != null ? (Math.max(1, Math.round(distM / 75)) <= 1 ? '1 min walk' : `${Math.max(1, Math.round(distM / 75))} min walk`) : undefined

  const chip = confidenceChip(confidence, horizonLabel)

  return (
    <div className="flex flex-col gap-3">
      {/* Top action */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white/90 text-sm font-semibold truncate">{top.text}</div>
          <div className="text-white/70 text-xs">
            {chip && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md mr-2"
                style={{ background: t.bg, border: `1px solid ${t.ring}` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: chip.color }} aria-hidden />
                {chip.label}
              </span>
            )}
            <span className="opacity-80">{top.friction} friction</span>
            <span className="opacity-50"> · </span>
            <span className="opacity-80">{Math.round(top.successProb * 100)}% likely</span>
          </div>
        </div>
        <button
          onClick={() => onPrimary(top)}
          className="px-3 py-2 rounded-md text-xs font-semibold"
          style={{ background: t.base, color: t.fg }}
          aria-label="Do it"
        >
          {primaryCtaLabel(top)}
        </button>
      </div>

      {/* Venue block (if present) */}
      {venueName && (
        <div
          className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
          style={{ background: t.bg, border: `1px solid ${t.ring}` }}
        >
          <div className="min-w-0">
            <div className="text-white/85 text-xs font-semibold truncate">{venueName}</div>
            <div className="text-white/65 text-[11px]">
              {walkText ? walkText : 'nearby'}
            </div>
          </div>
          {onChangeVenue && (
            <button
              onClick={onChangeVenue}
              className="text-white/85 text-[11px] underline"
              aria-label="Change venue"
            >
              Change venue
            </button>
          )}
        </div>
      )}

      {/* Why this is suggested */}
      {top.rationale?.length ? (
        <div className="text-white/65 text-[11px] leading-4">
          {top.rationale.slice(0, 2).join(' · ')}
        </div>
      ) : null}
    </div>
  )
}

/** Helpers */
function primaryCtaLabel(opt: InviteOption) {
  switch (opt.kind) {
    case 'spontaneous': return 'Rally now'
    case 'planned':     return opt.when ? `Plan ${opt.when}` : 'Plan time'
    case 'reconnect':   return 'Reconnect'
    case 'lowkey':      return 'Invite low-key'
    case 'highenergy':  return 'Invite'
    default:            return 'Invite'
  }
}

function confidenceChip(conf?: number, horizonLabel?: string) {
  if (conf == null) return null
  const c = Math.max(0, Math.min(1, conf))
  const label =
    c >= 0.75 ? 'High confidence' :
    c >= 0.45 ? 'Medium confidence' :
                'Low confidence'
  const color = c >= 0.75 ? '#34d399' : c >= 0.45 ? '#f59e0b' : '#ef4444' // green / amber / red
  return { label: horizonLabel ? `${label} · ${horizonLabel}` : label, color }
}