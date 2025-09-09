import React from 'react'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Node = {
  id: string
  pos: [number, number]   // abstract 0..1 screen space
  vibe?: string
  mass?: number
}

type Props = {
  active: boolean
  nodes: Node[]
  className?: string
  // Label + avatar are optional; provide functions if available
  getLabel?: (id: string) => string
  getAvatar?: (id: string) => string | null
  // Actions (wire to your flows)
  onInvite?: (id: string) => void
  onDM?: (id: string) => void
  onAddToPlan?: (id: string) => void
  // Pixel tolerance for hover hit testing
  hoverRadiusPx?: number
}

export function ConstellationDOMLayer({
  active,
  nodes,
  className,
  getLabel,
  getAvatar,
  onInvite,
  onDM,
  onAddToPlan,
  hoverRadiusPx = 28,
}: Props) {
  const layerRef = React.useRef<HTMLDivElement | null>(null)
  const [box, setBox] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const [hoverId, setHoverId] = React.useState<string | null>(null)
  const [hoverPos, setHoverPos] = React.useState<{ x: number; y: number } | null>(null)

  // Resize awareness
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

  // Throttled pointer move hit-test
  React.useEffect(() => {
    const el = layerRef.current
    if (!el) return
    let raf = 0
    const onMove = (ev: PointerEvent) => {
      if (!active) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = ev.clientX - rect.left
        const y = ev.clientY - rect.top

        // Find nearest node within tolerance
        let best: { id: string; d2: number; px: number; py: number; mass?: number; vibe?: string } | null = null
        for (const n of nodes) {
          const px = n.pos[0] * box.w
          const py = n.pos[1] * box.h
          const r = hoverRadiusPx + (n.mass ?? 0) * 3
          const dx = px - x
          const dy = py - y
          const d2 = dx*dx + dy*dy
          if (d2 <= r*r && (!best || d2 < best.d2)) best = { id: n.id, d2, px, py, mass: n.mass, vibe: n.vibe }
        }

        if (best) {
          setHoverId(best.id)
          setHoverPos({ x: best.px, y: best.py })
        } else {
          setHoverId(null)
          setHoverPos(null)
        }
      })
    }
    const onLeave = () => { setHoverId(null); setHoverPos(null) }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [active, nodes, box.w, box.h, hoverRadiusPx])

  // Click: prefer Invite
  const onClick = React.useCallback(() => {
    if (hoverId && onInvite) onInvite(hoverId)
  }, [hoverId, onInvite])

  // Derive label + avatar
  const label = hoverId ? (getLabel?.(hoverId) ?? ellipsize(hoverId)) : ''
  const avatarSrc = hoverId ? (getAvatar?.(hoverId) ?? null) : null
  const vibe = hoverId ? (nodes.find(n => n.id === hoverId)?.vibe as any) : null
  const t = getVibeToken(vibe || 'calm')

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
      onClick={active ? onClick : undefined}
    >
      {/* Hover halo (non-blocking) */}
      {active && hoverPos && (
        <div
          style={{
            position: 'absolute',
            left: hoverPos.x,
            top: hoverPos.y,
            transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: 9999,
            boxShadow: `0 0 22px ${t.glow}`,
            border: `1px solid ${t.ring}`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip card */}
      {active && hoverId && hoverPos && (
        <div
          role="dialog"
          aria-label="Friend quick actions"
          style={{
            position: 'absolute',
            left: hoverPos.x + 16,
            top: hoverPos.y - 28,
            transform: 'translateY(-100%)',
            pointerEvents: 'auto',
          }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl backdrop-blur"
            style={{
              background: t.bg,
              border: `1px solid ${t.ring}`,
              boxShadow: `0 0 24px ${t.glow}`,
            }}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full overflow-hidden shrink-0"
              style={{ background: t.base }}
              aria-hidden="true"
            >
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/90">
                  {label.slice(0,1).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="text-white/90 text-xs font-semibold max-w-[140px] truncate">{label}</div>

            {/* CTAs */}
            <div className="flex items-center gap-2 ml-1">
              {onInvite && (
                <button
                  onClick={(e) => { e.stopPropagation(); onInvite(hoverId) }}
                  className="px-2 py-1 rounded-md text-[11px]"
                  style={{ background: t.base, color: t.fg }}
                >
                  Invite
                </button>
              )}
              {onDM && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDM(hoverId) }}
                  className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80"
                >
                  DM
                </button>
              )}
              {onAddToPlan && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToPlan(hoverId) }}
                  className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ellipsize(id: string, n = 6) {
  return id.length > n ? id.slice(0, n) + '…' : id
}