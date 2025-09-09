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

  // Label / avatar optional providers
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
  maxPinned = 6
}: Props) {
  const layerRef = React.useRef<HTMLDivElement | null>(null)
  const [box, setBox] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 })

  // Hover state
  const [hoverId, setHoverId] = React.useState<string | null>(null)
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null)

  // Pinned tooltips
  const [pinned, setPinned] = React.useState<Pinned[]>([])

  // Lasso state
  const [dragging, setDragging] = React.useState(false)
  const [lasso, setLasso] = React.useState<{ path: Array<[number, number]>; ready: boolean }>({ path: [], ready: false })
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  // Resize & recompute
  React.useEffect(() => {
    const el = layerRef.current
    if (!el) return
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
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
          const dx = px - x, dy = py - y
          const d2 = dx*dx + dy*dy
          if (d2 <= r*r && (!best || d2 < best.d2)) best = { id: n.id, d2, px, py, mass: n.mass, vibe: n.vibe }
        }
        if (best) { setHoverId(best.id); setHoverPos({ x: best.px, y: best.py }) }
        else { setHoverId(null); setHoverPos(null) }
      })
    }
    const onLeave = () => { if (!dragging) { setHoverId(null); setHoverPos(null) } }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); if (raf) cancelAnimationFrame(raf) }
  }, [active, dragging, nodes, box.w, box.h, hoverRadiusPx])

  // Click to pin or invite
  const onClick = React.useCallback((ev: React.MouseEvent) => {
    if (!active) return
    // If a lasso selection was just completed, ignore click.
    if (lasso.ready) return
    if (hoverId) {
      if (pinOnClick) {
        setPinned(prev => {
          if (prev.find(p => p.id === hoverId)) return prev // already pinned
          const next = [...prev, { id: hoverId }]
          return next.slice(-maxPinned)
        })
      } else if (onInvite) {
        onInvite(hoverId)
      }
    }
  }, [active, lasso.ready, hoverId, pinOnClick, onInvite, maxPinned])

  // Lasso handlers
  React.useEffect(() => {
    const el = layerRef.current
    if (!el) return
    let raf = 0
    let lastX = 0, lastY = 0
    const MIN_STEP = 3

    const onDown = (ev: PointerEvent) => {
      if (!active) return
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
        const x = ev.clientX - rect.left
        const y = ev.clientY - rect.top
        if (Math.hypot(x-lastX, y-lastY) >= MIN_STEP) {
          lastX = x; lastY = y
          setLasso(prev => ({ path: [...prev.path, [x,y]], ready: false }))
        }
      })
    }
    const onUp = (ev: PointerEvent) => {
      if (!dragging) return
      setDragging(false)
      setLasso(prev => ({ ...prev, ready: true }))
      // Compute selection
      setSelectedIds(pointInPolygonSelect(nodes, lasso.path, box.w, box.h))
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
  }, [active, dragging, nodes, lasso.path, box.w, box.h])

  // Clear selection with ESC
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedIds([]); setLasso({ path: [], ready: false }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Helpers for labels/avatars
  const getName = (id: string) => getLabel?.(id) ?? ellipsize(id)
  const getImg  = (id: string) => getAvatar?.(id) ?? null

  // UI
  const hoverVibe = hoverId ? (nodes.find(n=>n.id===hoverId)?.vibe as any) : null
  const ht = getVibeToken(hoverVibe || 'calm')

  const showGroupBar = active && selectedIds.length >= 2

  return (
    <div
      ref={layerRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: active ? 'auto' : 'none',
        zIndex: 600,
        background: 'transparent',
      }}
      onClick={onClick}
    >
      {/* Hover halo */}
      {active && hoverPos && !dragging && (
        <div
          style={{
            position: 'absolute', left: hoverPos.x, top: hoverPos.y, transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: 9999,
            boxShadow: `0 0 22px ${ht.glow}`, border: `1px solid ${ht.ring}`,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Tooltip card (unpinned hover) */}
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

      {/* Pinned tooltips */}
      {active && pinned.map(p => {
        const n = nodes.find(n=>n.id===p.id); if (!n) return null
        const t = getVibeToken((n.vibe as any) || 'calm')
        const x = n.pos[0] * box.w + 16
        const y = n.pos[1] * box.h - 28
        return (
          <TooltipCard
            key={`pin-${p.id}`} x={x} y={y}
            label={getName(p.id)} avatar={getImg(p.id)} vibeToken={t}
            onInvite={onInvite ? () => onInvite(p.id) : undefined}
            onDM={onDM ? () => onDM(p.id) : undefined}
            onAdd={onAddToPlan ? () => onAddToPlan(p.id) : undefined}
            onClose={() => setPinned(prev => prev.filter(pp=>pp.id!==p.id))}
            pinned
          />
        )
      })}

      {/* Lasso overlay */}
      {active && (dragging || lasso.ready) && lasso.path.length >= 2 && (
        <svg
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          width="100%" height="100%" viewBox={`0 0 ${box.w} ${box.h}`}
        >
          <polyline
            points={lasso.path.map(p => p.join(',')).join(' ')}
            fill={lasso.ready ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.5}
          />
        </svg>
      )}

      {/* Group action bar */}
      {showGroupBar && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur"
          style={{
            position:'absolute', left:'50%', transform:'translateX(-50%)',
            bottom: 24, zIndex: 610,
            background:'rgba(0,0,0,0.45)', border:'1px solid rgba(255,255,255,0.25)'
          }}
        >
          <div className="text-white/90 text-sm">{selectedIds.length} selected</div>
          {onGroupInvite && (
            <button onClick={() => onGroupInvite(selectedIds)} className="px-3 py-2 rounded-md bg-white/20 text-white text-sm">Invite</button>
          )}
          {onGroupDM && (
            <button onClick={() => onGroupDM(selectedIds)} className="px-3 py-2 rounded-md bg-white/10 text-white/80 text-sm">DM</button>
          )}
          {onGroupAddToPlan && (
            <button onClick={() => onGroupAddToPlan(selectedIds)} className="px-3 py-2 rounded-md bg-white/10 text-white/80 text-sm">Add</button>
          )}
          <button onClick={() => { setSelectedIds([]); setLasso({ path:[], ready:false }) }} className="px-3 py-2 rounded-md bg-white/10 text-white/80 text-sm">Clear</button>
        </div>
      )}
    </div>
  )
}

// ---------- helpers ----------

function ellipsize(id: string, n = 6) { return id.length > n ? id.slice(0, n) + '…' : id }

function pointInPolygonSelect(nodes: Node[], poly: Array<[number,number]>, w:number, h:number) {
  if (poly.length < 3) return []
  const res: string[] = []
  for (const n of nodes) {
    const x = n.pos[0]*w, y = n.pos[1]*h
    if (pointInPolygon([x,y], poly)) res.push(n.id)
  }
  return res
}

function pointInPolygon(p:[number,number], poly:Array<[number,number]>) {
  // ray casting
  const [x,y] = p; let c = false
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi)
    if (intersect) c = !c
  }
  return c
}

function TooltipCard({
  x, y, label, avatar, vibeToken,
  onInvite, onDM, onAdd, onClose, pinned
}: {
  x:number; y:number; label:string; avatar:string|null; vibeToken:ReturnType<typeof getVibeToken>;
  onInvite?:()=>void; onDM?:()=>void; onAdd?:()=>void; onClose?:()=>void; pinned?: boolean
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-xl backdrop-blur"
      style={{
        position:'absolute', left:x, top:y, transform:'translateY(-100%)',
        background: vibeToken.bg, border: `1px solid ${vibeToken.ring}`, boxShadow: `0 0 24px ${vibeToken.glow}`,
        pointerEvents:'auto'
      }}
    >
      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0" style={{ background: vibeToken.base }} aria-hidden="true">
        {avatar
          ? <img src={avatar} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[10px] text-white/90">{label.slice(0,1).toUpperCase()}</div>
        }
      </div>
      <div className="text-white/90 text-xs font-semibold max-w-[140px] truncate">{label}</div>
      <div className="flex items-center gap-2 ml-1">
        {onInvite && <button onClick={(e)=>{e.stopPropagation(); onInvite()}} className="px-2 py-1 rounded-md text-[11px]" style={{ background:vibeToken.base, color:vibeToken.fg }}>Invite</button>}
        {onDM && <button onClick={(e)=>{e.stopPropagation(); onDM()}} className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80">DM</button>}
        {onAdd && <button onClick={(e)=>{e.stopPropagation(); onAdd()}} className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80">Add</button>}
        {pinned && onClose && <button onClick={(e)=>{e.stopPropagation(); onClose()}} className="px-1.5 py-1 rounded-md text-[11px] bg-white/10 text-white/70">×</button>}
      </div>
    </div>
  )
}