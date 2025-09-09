import React from 'react'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Node = {
  id: string
  pos: [number, number]   // 0..1 abstract screen space
  vibe?: string
  mass?: number
}

type Props = {
  active: boolean
  nodes: Node[]
  className?: string

  // Label / avatar (optional providers)
  getLabel?: (id: string) => string
  getAvatar?: (id: string) => string | null

  // Single actions (existing)
  onInvite?: (id: string) => void
  onDM?: (id: string) => void
  onAddToPlan?: (id: string) => void

  // Group actions (new)
  onGroupInvite?: (ids: string[]) => void
  onGroupDM?: (ids: string[]) => void
  onGroupAddToPlan?: (ids: string[]) => void

  // Options
  hoverRadiusPx?: number
  pinOnClick?: boolean
  maxPinned?: number

  // Optional: rank avatars by in-group tie strength w/ recency decay
  edgesForRanking?: { a:string; b:string; strength:number; lastSync?: string }[];
}

type Pinned = { id: string }

export function ConstellationDOMLayer({
  active,
  nodes,
  className,
  getLabel,
  getAvatar,
  onInvite,
  onDM,
  onAddToPlan,
  onGroupInvite,
  onGroupDM,
  onGroupAddToPlan,
  hoverRadiusPx = 28,
  pinOnClick = true,
  maxPinned = 6,
  edgesForRanking
}: Props) {
  const layerRef = React.useRef<HTMLDivElement | null>(null)
  const [box, setBox] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 })

  // Hover state
  const [hoverId, setHoverId] = React.useState<string | null>(null)
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null)

  // Pinned tooltips
  const [pinned, setPinned] = React.useState<Pinned[]>([])
  const [pinOffsets, setPinOffsets] = React.useState<Record<string, { dx: number; dy: number }>>({})

  // Lasso state
  const [dragging, setDragging] = React.useState(false)
  const [lasso, setLasso] = React.useState<{ path: Array<[number, number]>; ready: boolean }>({ path: [], ready: false })
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [lassoMode, setLassoMode] = React.useState<'add' | 'subtract'>('add') // Alt = subtract

  // Resize awareness
  React.useEffect(() => {
    const el = layerRef.current
    if (!el) return
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // rAF-throttled pointer move hit-test (hover)
  React.useEffect(() => {
    const el = layerRef.current
    if (!el) return
    let raf = 0
    const onMove = (ev: PointerEvent) => {
      if (!active || dragging) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = ev.clientX - rect.left
        const y = ev.clientY - rect.top
        let best: { id: string; d2: number; px: number; py: number; mass?: number; vibe?: string } | null = null
        for (const n of nodes) {
          const px = n.pos[0] * box.w
          const py = n.pos[1] * box.h
          const r = hoverRadiusPx + (n.mass ?? 0) * 3
          const dx = px - x
          const dy = py - y
          const d2 = dx * dx + dy * dy
          if (d2 <= r * r && (!best || d2 < best.d2)) best = { id: n.id, d2, px, py, mass: n.mass, vibe: n.vibe }
        }
        if (best) { setHoverId(best.id); setHoverPos({ x: best.px, y: best.py }) }
        else { setHoverId(null); setHoverPos(null) }
      })
    }
    const onLeave = () => { if (!dragging) { setHoverId(null); setHoverPos(null) } }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active, dragging, nodes, box.w, box.h, hoverRadiusPx])

  // Click to pin or invite
  const onClick = React.useCallback((ev: React.MouseEvent) => {
    if (!active) return
    // Ignore click immediately after lasso completes
    if (lasso.ready) { setLasso({ path: [], ready: false }); return }
    if (hoverId) {
      if (pinOnClick) {
        setPinned(prev => {
          if (prev.find(p => p.id === hoverId)) return prev
          const next = [...prev, { id: hoverId }]
          return next.slice(-maxPinned)
        })
      } else if (onInvite) {
        onInvite(hoverId)
      }
    }
  }, [active, lasso.ready, hoverId, pinOnClick, onInvite, maxPinned])

  // Lasso: Alt=Subtract, Shift=Constrain (8 directions)
  React.useEffect(() => {
    const el = layerRef.current
    if (!el) return
    let raf = 0
    let lastX = 0, lastY = 0
    const MIN_STEP = 3

    const onDown = (ev: PointerEvent) => {
      if (!active) return
      setLassoMode(ev.altKey ? 'subtract' : 'add')
      setDragging(true)
      setLasso({ path: [], ready: false })
      const rect = el.getBoundingClientRect()
      lastX = ev.clientX - rect.left
      lastY = ev.clientY - rect.top
      setLasso({ path: [[lastX, lastY]], ready: false })
      el.setPointerCapture(ev.pointerId)
    }

    const onMove = (ev: PointerEvent) => {
      if (!dragging) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        let x = ev.clientX - rect.left
        let y = ev.clientY - rect.top

        // Shift constrain: snap segment to nearest 45°
        if (ev.shiftKey) {
          const dx = x - lastX, dy = y - lastY
          if (Math.hypot(dx, dy) > 2) {
            const ang = Math.atan2(dy, dx)
            const snap = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4)
            const dist = Math.hypot(dx, dy)
            x = lastX + Math.cos(snap) * dist
            y = lastY + Math.sin(snap) * dist
          }
        }

        if (Math.hypot(x - lastX, y - lastY) >= MIN_STEP) {
          lastX = x; lastY = y
          setLasso(prev => ({ path: [...prev.path, [x, y]], ready: false }))
        }
      })
    }

    const onUp = (ev: PointerEvent) => {
      if (!dragging) return
      setDragging(false)
      setLasso(prev => ({ ...prev, ready: true }))
      const picked = pointInPolygonSelect(nodes, lasso.path, box.w, box.h)
      setSelectedIds(prev => {
        const set = new Set(prev)
        if (lassoMode === 'subtract') picked.forEach(id => set.delete(id))
        else picked.forEach(id => set.add(id))
        return Array.from(set)
      })
      try { el.releasePointerCapture(ev.pointerId) } catch {}
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active, dragging, nodes, lasso.path, box.w, box.h, lassoMode])

  // ESC clears lasso + selection
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelectedIds([]); setLasso({ path: [], ready: false }) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Drag-to-reposition pinned card
  const startPinDrag = (id: string, startX: number, startY: number) => {
    const el = layerRef.current!
    const rect = el.getBoundingClientRect()
    const sx = startX - rect.left, sy = startY - rect.top
    const cur = pinOffsets[id] ?? { dx: 0, dy: 0 }
    const base = getNodePx(id, nodes, box)
    const origin = { ox: cur.dx, oy: cur.dy, baseX: base.x, baseY: base.y, sx, sy }
    const onMove = (e: PointerEvent) => {
      const x = e.clientX - rect.left, y = e.clientY - rect.top
      setPinOffsets(prev => ({ ...prev, [id]: { dx: origin.ox + (x - origin.sx), dy: origin.oy + (y - origin.sy) } }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
  }

  // Helpers for labels/avatars
  const getName = (id: string) => getLabel?.(id) ?? ellipsize(id)
  const getImg = (id: string) => getAvatar?.(id) ?? null

  // Toggle selection helper for avatar strip
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id); else set.add(id);
      return Array.from(set);
    });
  };

  const hoverVibe = hoverId ? (nodes.find(n => n.id === hoverId)?.vibe as any) : null
  const ht = getVibeToken(hoverVibe || 'calm')
  const showGroupBar = active && selectedIds.length >= 2

  // Compute ordered selection for display
  const orderedSelected = React.useMemo(() => {
    return edgesForRanking?.length
      ? rankSelectedByStrength(selectedIds, edgesForRanking)
      : selectedIds;
  }, [selectedIds, edgesForRanking]);

  return (
    <div
      ref={layerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: active ? 'auto' : 'none', zIndex: 600 }}
      onClick={onClick}
    >
      {/* Hover halo */}
      {active && hoverPos && !dragging && (
        <div
          aria-hidden
          style={{
            position: 'absolute', left: hoverPos.x, top: hoverPos.y, transform: 'translate(-50%,-50%)',
            width: 26, height: 26, borderRadius: 9999, boxShadow: `0 0 22px ${ht.glow}`, border: `1px solid ${ht.ring}`,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Tooltip (hover) */}
      {active && hoverId && hoverPos && !dragging && (
        <TooltipCard
          x={hoverPos.x + 16} y={hoverPos.y - 28}
          label={getName(hoverId)}
          avatar={getImg(hoverId)}
          vibeToken={ht}
          onInvite={onInvite ? () => onInvite(hoverId) : undefined}
          onDM={onDM ? () => onDM(hoverId) : undefined}
          onAdd={onAddToPlan ? () => onAddToPlan(hoverId) : undefined}
        />
      )}

      {/* Pinned tooltips (draggable) */}
      {active && pinned.map(p => {
        const n = nodes.find(n => n.id === p.id); if (!n) return null
        const t = getVibeToken((n.vibe as any) || 'calm')
        const base = getNodePx(p.id, nodes, box)
        const off = pinOffsets[p.id] ?? { dx: 0, dy: 0 }
        const x = base.x + off.dx, y = base.y + off.dy
        return (
          <TooltipCard
            key={`pin-${p.id}`} x={x} y={y}
            label={getName(p.id)} avatar={getImg(p.id)} vibeToken={t}
            onInvite={onInvite ? () => onInvite(p.id) : undefined}
            onDM={onDM ? () => onDM(p.id) : undefined}
            onAdd={onAddToPlan ? () => onAddToPlan(p.id) : undefined}
            onClose={() => setPinned(prev => prev.filter(pp => pp.id !== p.id))}
            pinned
            onPointerDown={(e) => { e.stopPropagation(); startPinDrag(p.id, e.clientX, e.clientY) }}
          />
        )
      })}

      {/* Lasso overlay */}
      {active && (dragging || lasso.ready) && lasso.path.length >= 2 && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
             width="100%" height="100%" viewBox={`0 0 ${box.w} ${box.h}`}>
          <polyline
            points={lasso.path.map(p => p.join(',')).join(' ')}
            fill={lasso.ready ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}
            stroke="rgba(255,255,255,0.25)" strokeWidth={1.5}
          />
        </svg>
      )}

      {/* Group action bar */}
      {showGroupBar && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur"
             style={{
               position: 'absolute', left: '50%', transform: 'translateX(-50%)',
               bottom: 24, zIndex: 610,
               background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.25)'
             }}>
          <div className="text-white/90 text-sm mr-1">{orderedSelected.length} selected</div>

          <GroupAvatarStrip
            ids={orderedSelected}
            getAvatar={getImg}
            getLabel={getName}
            max={8}
            onToggle={toggleSelected}
          />

          {onGroupInvite && (
            <button onClick={() => onGroupInvite(selectedIds)}
                    className="px-3 py-2 rounded-md bg-white/20 text-white text-sm">Invite</button>
          )}
          {onGroupDM && (
            <button onClick={() => onGroupDM(selectedIds)}
                    className="px-3 py-2 rounded-md bg-white/10 text-white/80 text-sm">DM</button>
          )}
          {onGroupAddToPlan && (
            <button onClick={() => onGroupAddToPlan(selectedIds)}
                    className="px-3 py-2 rounded-md bg-white/10 text-white/80 text-sm">Add</button>
          )}
          <button onClick={() => { setSelectedIds([]); setLasso({ path: [], ready: false }) }}
                  className="px-3 py-2 rounded-md bg-white/10 text-white/80 text-sm">Clear</button>
        </div>
      )}
    </div>
  )
}

// ---------- helpers ----------

function ellipsize(id: string, n = 6) { return id.length > n ? id.slice(0, n) + '…' : id }

function pointInPolygonSelect(nodes: Node[], poly: Array<[number, number]>, w: number, h: number) {
  if (poly.length < 3) return []
  const res: string[] = []
  for (const n of nodes) {
    const x = n.pos[0] * w, y = n.pos[1] * h
    if (pointInPolygon([x, y], poly)) res.push(n.id)
  }
  return res
}

function pointInPolygon(p: [number, number], poly: Array<[number, number]>) {
  // ray casting
  const [x, y] = p; let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) + 1e-9) + xi)
    if (intersect) c = !c
  }
  return c
}

function getNodePx(id: string, nodes: Node[], box: { w: number; h: number }) {
  const n = nodes.find(n => n.id === id); if (!n) return { x: 0, y: 0 }
  return { x: n.pos[0] * box.w + 16, y: n.pos[1] * box.h - 28 }
}

type RankEdge = { a: string; b: string; strength: number; lastSync?: string };

// Score = sum of (edge.strength * recencyWeight) over edges *within* the selection.
// recencyWeight = exp(-daysSinceLastSync / 30)  (half-life ~21 days)
function rankSelectedByStrength(selectedIds: string[], edges: RankEdge[]) {
  if (!selectedIds.length || !edges?.length) return selectedIds;
  const sel = new Set(selectedIds);
  const now = Date.now();
  const score = new Map<string, number>();

  // init scores
  for (const id of selectedIds) score.set(id, 0);

  for (const e of edges) {
    if (!sel.has(e.a) || !sel.has(e.b)) continue;
    const last = e.lastSync ? Date.parse(e.lastSync) : now;
    const days = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
    const rec = Math.exp(-days / 30); // 30-day decay
    const w = Math.max(0, Math.min(1, e.strength)) * rec;

    score.set(e.a, (score.get(e.a) || 0) + w);
    score.set(e.b, (score.get(e.b) || 0) + w);
  }

  return [...selectedIds].sort((i1, i2) => (score.get(i2)! - score.get(i1)!));
}

function GroupAvatarStrip({
  ids,
  getAvatar,
  getLabel,
  max = 8,
  ring = 'rgba(255,255,255,0.35)',
  bg  = 'rgba(0,0,0,0.35)',
  onToggle,
}: {
  ids: string[];
  getAvatar?: (id: string) => string | null;
  getLabel?: (id: string) => string;
  max?: number;
  ring?: string; // outline color
  bg?: string;   // background behind images/initials
  onToggle?: (id: string) => void;
}) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex items-center -space-x-3 mr-2">
        {shown.map((id) => {
          const avatar = getAvatar?.(id) ?? null;
          const label  = getLabel?.(id)  ?? id;
          const initial = label?.slice(0,1).toUpperCase() ?? '•';

          const onKey = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle?.(id);
            }
          };

          return (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={`Toggle ${label}`}
              aria-pressed={true}
              onClick={() => onToggle?.(id)}
              onKeyDown={onKey}
              className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ outline: `1px solid ${ring}`, outlineOffset: -1, background: bg }}
            >
              {avatar ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img src={avatar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/90">
                  {initial}
                </div>
              )}
              {/* tiny remove hint */}
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 w-3.5 h-3.5 rounded-full bg-black/70 text-white text-[9px] leading-[14px] text-center"
                style={{ border: `1px solid ${ring}` }}
              >
                −
              </span>
            </button>
          );
        })}
        {extra > 0 && (
          <div
            className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-semibold"
            style={{ outline: `1px solid ${ring}`, outlineOffset: -1, background: 'rgba(255,255,255,0.15)', color: 'white' }}
            aria-label={`plus ${extra} more`}
            title={`+${extra} more`}
          >
            +{extra}
          </div>
        )}
      </div>
    </div>
  );
}

function TooltipCard({
  x, y, label, avatar, vibeToken,
  onInvite, onDM, onAdd, onClose, pinned, onPointerDown
}: {
  x: number; y: number; label: string; avatar: string | null; vibeToken: ReturnType<typeof getVibeToken>;
  onInvite?: () => void; onDM?: () => void; onAdd?: () => void; onClose?: () => void; pinned?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl backdrop-blur"
      style={{
        position: 'absolute', left: x, top: y, transform: 'translateY(-100%)',
        background: vibeToken.bg, border: `1px solid ${vibeToken.ring}`, boxShadow: `0 0 24px ${vibeToken.glow}`,
        pointerEvents: 'auto', cursor: pinned ? 'grab' : 'default'
      }}
      onPointerDown={pinned ? onPointerDown : undefined}
      role="dialog" aria-label="Friend quick actions"
    >
      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0" style={{ background: vibeToken.base }} aria-hidden="true">
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[10px] text-white/90">
              {label.slice(0, 1).toUpperCase()}
            </div>}
      </div>

      <div className="text-white/90 text-xs font-semibold max-w-[140px] truncate">{label}</div>

      <div className="flex items-center gap-2 ml-1">
        {onInvite && (
          <button aria-label="Invite"
                  onClick={(e) => { e.stopPropagation(); onInvite() }}
                  className="px-2 py-1 rounded-md text-[11px]"
                  style={{ background: vibeToken.base, color: vibeToken.fg }}>
            Invite
          </button>
        )}
        {onDM && (
          <button aria-label="DM"
                  onClick={(e) => { e.stopPropagation(); onDM() }}
                  className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80">
            DM
          </button>
        )}
        {onAdd && (
          <button aria-label="Add to plan"
                  onClick={(e) => { e.stopPropagation(); onAdd() }}
                  className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80">
            Add
          </button>
        )}
        {pinned && onClose && (
          <button aria-label="Close"
                  onClick={(e) => { e.stopPropagation(); onClose() }}
                  className="px-1.5 py-1 rounded-md text-[11px] bg-white/10 text-white/70">
            ×
          </button>
        )}
      </div>
    </div>
  )
}