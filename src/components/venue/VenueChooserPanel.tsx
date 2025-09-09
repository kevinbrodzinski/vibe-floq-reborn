import React from 'react'
import { vibeTokens, normalizeVibeToken } from '@/lib/vibe/tokens'

/** Keep these in-sync with your inviteEngine / venue decorator */
export type InviteKind = 'spontaneous' | 'planned' | 'reconnect' | 'lowkey' | 'highenergy' | 'bridge-groups' | 'food' | 'venue' | 'custom'
export type InviteOption = {
  kind: InviteKind
  text: string
  score: number
  when?: string
  at?: Date
  friction: 'low' | 'medium' | 'high'
  successProb: number
  rationale: string[]
  tags?: string[]
  payload?: Record<string, unknown>
}
export type VenueLite = {
  id: string
  name: string
  loc: { lng: number; lat: number }
  vibeTags?: string[]        // ['hype','cozy','cocktails','coffee'...]
  openNow?: boolean
  priceLevel?: 0|1|2|3|4
  popularityLive?: number    // 0..1 if available
  photoUrl?: string | null
}

type Bias = 'neutral' | 'lowkey' | 'highenergy' | 'coffee' | 'cocktails';

type Props = {
  /** Anchor position (absolute parent) */
  style?: React.CSSProperties
  className?: string
  option: InviteOption
  venues: VenueLite[]
  /** Focus centroid (e.g., convergence centroid) to compute distance/time */
  focus?: [number, number]      // [lng, lat]
  /** Exclude currently suggested venueId (if the option already has one) */
  excludeVenueId?: string | null
  /** Called when a venue is chosen */
  onSelect: (venue: VenueLite) => void
  /** Optional preview (e.g., center map, open photo) */
  onPreview?: (venue: VenueLite) => void
  onClose?: () => void
  /** meters / minute; ~75 ≈ 4.5 km/h */
  walkMpm?: number
  /** Cap search radius meters; default 1200 */
  maxDistanceM?: number
  /** Optional vibe to tint header */
  currentVibe?: string
  bias?: Bias
  favoriteIds?: Set<string>           // 👈 NEW
  onToggleFavorite?: (venueId: string, next: boolean) => void  // 👈 NEW
  onSaveShortlist?: (name: string, venueIds: string[]) => void // 👈 NEW
  firstFocusRef?: React.RefObject<HTMLButtonElement>  // 👈 NEW
}

// Simple vibe token getter for the panel styling
function getVibeToken(vibe: string) {
  const token = normalizeVibeToken(vibe);
  const hex = vibeTokens[token];
  
  return {
    bg: `${hex}15`, // 15% opacity
    ring: `${hex}40`, // 40% opacity
    glow: `${hex}30`, // 30% opacity
    base: hex,
    fg: '#ffffff'
  };
}

function priceSymbols(level: number) {
  return '$'.repeat(Math.max(1, Math.min(4, level)))
}

/** --------- Panel --------- */
export function VenueChooserPanel({
  style, className,
  option, venues, focus, excludeVenueId,
  onSelect, onPreview, onClose,
  walkMpm = 75, maxDistanceM = 1200,
  currentVibe = 'calm',
  bias = 'neutral',
  favoriteIds, onToggleFavorite, onSaveShortlist,
  firstFocusRef
}: Props) {
  const t = getVibeToken(currentVibe)
  const [page, setPage] = React.useState(0) // 0: main, 1: alt "more like this"
  const [tab, setTab] = React.useState<'top'|'favorites'>('top')

  const { top, reason } = React.useMemo(() => {
    const bucket = timeOfDayBucket(new Date())
    const favSet = favoriteIds ?? new Set<string>()
    const baseList = venues.filter(v => !excludeVenueId || v.id !== excludeVenueId)
    const filtered = tab==='favorites' ? baseList.filter(v => favSet.has(v.id)) : baseList
    
    const scored = filtered
      .map(v => ({
        v,
        dM: distanceMeters(v.loc, focus),
        s: biasedVenueScore(option, v, bucket, bias, favSet.has(v.id)),
      }))
      .filter(x => x.dM <= maxDistanceM)
      .sort((a, b) => (b.s - a.s) || (a.dM - b.dM))

    const pick = scored.slice(page === 0 ? 0 : 3, page === 0 ? 3 : 6)
    const r = page === 0
      ? `Top matches for "${bucketLabel(bucket)}" + "${intentLabel(option.kind)}"`
      : `More like this (${biasLabel(bias)})`
    return { top: pick, reason: r }
  }, [venues, option, focus, excludeVenueId, maxDistanceM, bias, page, tab, favoriteIds])

  if (!top.length) return null

  return (
    <div
      className={['rounded-xl shadow-lg backdrop-blur', className].filter(Boolean).join(' ')}
      style={{
        position: 'absolute',
        minWidth: 360,
        maxWidth: 420,
        background: t.bg,
        border: `1px solid ${t.ring}`,
        boxShadow: `0 0 24px ${t.glow}`,
        ...style,
      }}
      role="dialog"
      aria-label="Venue chooser"
      data-testid="venue-chooser-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-white/90 text-sm font-semibold">Suggested venues</div>
          <div className="flex items-center gap-2">
            <button
              className={`text-xs px-2 py-1 rounded-md ${tab==='top' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white/90'}`}
              onClick={()=>setTab('top')}
              aria-pressed={tab==='top'}
            >Top</button>
            <button
              className={`text-xs px-2 py-1 rounded-md ${tab==='favorites' ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white/90'}`}
              onClick={()=>setTab('favorites')}
              aria-pressed={tab==='favorites'}
            >Favorites</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-white/60 text-xs">{reason}</div>
          {onClose && (
            <button
              className="text-white/70 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/15"
              onClick={onClose}
              aria-label="Close"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-white/10" role="listbox" aria-label="Venue alternatives">
        {top.map((row, index) => {
          const mins = Math.max(1, Math.round(row.dM / walkMpm))
          const distText = mins <= 1 ? '1 min walk' : `${mins} min walk`
          return (
            <li key={row.v.id} className="flex items-center gap-3 px-4 py-3" role="option">
              {/* Thumb */}
              <div
                className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black/30"
                style={{ border: `1px solid ${t.ring}` }}
                aria-hidden
              >
                {row.v.photoUrl ? (
                  <img src={row.v.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-white/70">
                    {row.v.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-white/90 text-sm font-semibold truncate">{row.v.name}</div>
                  {row.v.openNow ? (
                    <span className="text-green-300/90 text-[11px]">Open</span>
                  ) : (
                    <span className="text-white/60 text-[11px]">Hours vary</span>
                  )}
                </div>
                <div className="text-white/70 text-xs">
                  {distText}
                  {row.v.priceLevel != null && <span> · {priceSymbols(row.v.priceLevel)}</span>}
                  {row.v.vibeTags?.length ? (
                    <span> · {row.v.vibeTags.slice(0, 2).join(' · ')}</span>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Favorite star */}
                <button
                  className="px-2 py-1 rounded-md text-[12px] bg-white/10 text-white/85 hover:bg-white/15"
                  aria-label="Toggle favorite"
                  onClick={() => {
                    const next = !(favoriteIds?.has(row.v.id) ?? false)
                    onToggleFavorite?.(row.v.id, next)
                  }}
                  title={(favoriteIds?.has(row.v.id) ?? false) ? 'Unfavorite' : 'Favorite'}
                >
                  {(favoriteIds?.has(row.v.id) ?? false) ? '★' : '☆'}
                </button>
                {onPreview && (
                  <button
                    className="px-2 py-1 rounded-md text-[12px] bg-white/10 text-white/85 hover:bg-white/15"
                    aria-label={`Preview ${row.v.name}`}
                    onClick={() => onPreview(row.v)}
                  >
                    Preview
                  </button>
                )}
                <button
                  ref={index === 0 ? firstFocusRef : undefined}
                  className="px-3 py-1.5 rounded-md text-[12px]"
                  style={{ background: t.base, color: t.fg }}
                  aria-label={`Select ${row.v.name}`}
                  onClick={() => onSelect(row.v)}
                >
                  Select
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <button
            className="text-white/80 text-xs underline disabled:opacity-40"
            onClick={() => setPage(p => (p === 0 ? 1 : 0))}
            aria-label="More like this"
          >
            {page === 0 ? 'More like this' : 'Back to top picks'}
          </button>
          <span className="text-white/60 text-[11px]">Bias: {biasLabel(bias)}</span>
        </div>
        <button
          className="text-white/90 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/15"
          aria-label="Save shortlist"
          onClick={() => {
            const name = window.prompt('Name this shortlist:', 'Tonight picks')
            if (!name) return
            const venueIds = top.map(x => x.v.id)
            onSaveShortlist?.(name, venueIds)
          }}
        >
          Save shortlist
        </button>
      </div>
    </div>
  )
}

/* ---------------------- Scoring (biased) ----------------------------------- */

type TimeBucket = 'morning' | 'noon' | 'evening' | 'late'
function timeOfDayBucket(now: Date): TimeBucket {
  const h = now.getHours()
  if (h < 11) return 'morning'
  if (h < 16) return 'noon'
  if (h < 23) return 'evening'
  return 'late'
}
function bucketLabel(b: TimeBucket) {
  return b === 'morning' ? 'morning' : b === 'noon' ? 'midday' : b === 'evening' ? 'evening' : 'late'
}
function intentLabel(kind: InviteKind) {
  switch (kind) {
    case 'spontaneous': return 'spontaneous'
    case 'lowkey':      return 'low-key'
    case 'highenergy':  return 'high-energy'
    case 'planned':     return 'planned'
    default:            return 'plan'
  }
}
function biasLabel(b: Bias) {
  return b === 'neutral' ? 'neutral' :
         b === 'lowkey'  ? 'cozy/quiet' :
         b === 'highenergy' ? 'lively' :
         b === 'coffee' ? 'coffee' : 'cocktails';
}

function biasedVenueScore(opt: InviteOption, v: VenueLite, bucket: TimeBucket, bias: Bias, isFav: boolean): number {
  const tags = new Set((v.vibeTags ?? []).map(s => s.trim().toLowerCase()))
  const live = clamp01(v.popularityLive ?? 0.5)

  const tod =
    (bucket === 'morning' && (tags.has('coffee') || tags.has('breakfast')))  ? 1.0 :
    (bucket === 'noon'    && (tags.has('lunch') || tags.has('casual')))      ? 0.8 :
    (bucket === 'evening' && (tags.has('cocktails') || tags.has('dinner')))  ? 1.0 :
    (bucket === 'late'    && (tags.has('night') || tags.has('club')))        ? 1.0 : 0.6

  const kind =
    opt.kind === 'spontaneous' ? 'spont' :
    opt.kind === 'lowkey'      ? 'low'   :
    opt.kind === 'highenergy'  ? 'high'  :
    opt.kind === 'planned'     ? 'plan'  : 'other'

  let intent =
    (kind === 'spont' && (live > 0.45 ? 1.0 : 0.8)) ||
    (kind === 'low'   && (tags.has('cozy') || tags.has('calm') ? 1.0 : 0.7)) ||
    (kind === 'high'  && (tags.has('hype') || tags.has('live') ? 1.0 : 0.7)) ||
    (kind === 'plan'  ? 0.9 : 0.8)

  // Apply bias
  if (bias === 'lowkey') intent *= tags.has('cozy') || tags.has('calm') ? 1.15 : 0.9
  if (bias === 'highenergy') intent *= tags.has('hype') || tags.has('live') ? 1.15 : 0.9
  if (bias === 'coffee') intent *= tags.has('coffee') ? 1.2 : 0.85
  if (bias === 'cocktails') intent *= tags.has('cocktails') ? 1.2 : 0.85

  const open = v.openNow ? 1.0 : 0.75
  const price = 1.0 - ((v.priceLevel ?? 2) * 0.05)

  const base = clamp01(0.5 * tod + 0.3 * intent + 0.15 * open + 0.05 * price)
  return isFav ? clamp01(base * 1.12) : base   // small favorite boost
}

/* ----------------------- Distance / math utils ------------------------------ */

function distanceMeters(a: {lng:number;lat:number} | undefined, focus?: [number,number]) {
  if (!a) return Infinity
  if (!focus) return 0
  return haversine(a.lat, a.lng, focus[1], focus[0])
}
function haversine(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371000; const toRad = (x:number)=>x*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1)
  const s1 = Math.sin(dLat/2)**2, s2 = Math.sin(dLon/2)**2
  const c = 2*Math.asin(Math.sqrt(s1 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*s2))
  return R * c
}
const clamp01 = (v:number)=>Math.max(0,Math.min(1,v))