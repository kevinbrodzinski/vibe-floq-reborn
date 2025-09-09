// src/components/overlays/ConstellationDOMLayer.tsx
import React from 'react'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Node = { id: string; pos: [number, number]; vibe?: string; mass?: number }

export function ConstellationDOMLayer({
  active, nodes, className,
  getLabel, getAvatar, onInvite, onDM, onAddToPlan, hoverRadiusPx = 28,
}: {
  active: boolean; nodes: Node[]; className?: string
  getLabel?: (id:string)=>string; getAvatar?: (id:string)=>string|null
  onInvite?: (id:string)=>void; onDM?: (id:string)=>void; onAddToPlan?: (id:string)=>void
  hoverRadiusPx?: number
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [box, setBox] = React.useState({ w:0, h:0 })
  const [hover, setHover] = React.useState<{ id:string; x:number; y:number } | null>(null)

  React.useEffect(() => {
    const el = ref.current; if (!el) return
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el); window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  React.useEffect(() => {
    const el = ref.current; if (!el) return
    let raf = 0
    const onMove = (ev: PointerEvent) => {
      if (!active) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const x = ev.clientX - rect.left, y = ev.clientY - rect.top
        let best: { id:string; d2:number; x:number; y:number } | null = null
        for (const n of nodes) {
          const px = n.pos[0]*box.w, py = n.pos[1]*box.h
          const r = hoverRadiusPx + (n.mass ?? 0)*3
          const d2 = (px-x)*(px-x) + (py-y)*(py-y)
          if (d2 <= r*r && (!best || d2 < best.d2)) best = { id:n.id, d2, x:px, y:py }
        }
        setHover(best)
      })
    }
    const onLeave = () => setHover(null)
    el.addEventListener('pointermove', onMove, { passive:true })
    el.addEventListener('pointerleave', onLeave)
    return () => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); if (raf) cancelAnimationFrame(raf) }
  }, [active, nodes, box, hoverRadiusPx])

  const label = hover ? (getLabel?.(hover.id) ?? ellipsize(hover.id)) : ''
  const avatar = hover ? (getAvatar?.(hover.id) ?? null) : null
  const vibe = hover ? (nodes.find(n=>n.id===hover.id)?.vibe as any) : null
  const t = getVibeToken(vibe || 'calm')

  return (
    <div
      ref={ref}
      className={className}
      style={{ position:'absolute', inset:0, pointerEvents: active ? 'auto' : 'none', zIndex:600 }}
      onClick={() => { if (hover?.id && onInvite) onInvite(hover.id) }}
    >
      {active && hover && (
        <>
          <div
            aria-hidden
            style={{
              position:'absolute', left:hover.x, top:hover.y, transform:'translate(-50%,-50%)',
              width:26, height:26, borderRadius:9999, boxShadow:`0 0 22px ${t.glow}`, border:`1px solid ${t.ring}`,
              pointerEvents:'none'
            }}
          />
          <div
            role="dialog" aria-label="Friend quick actions"
            className="flex items-center gap-3 px-3 py-2 rounded-xl backdrop-blur"
            style={{ position:'absolute', left:hover.x+16, top:hover.y-28, transform:'translateY(-100%)',
                     background:t.bg, border:`1px solid ${t.ring}`, boxShadow:`0 0 24px ${t.glow}` }}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0" style={{ background:t.base }}>
              {avatar
                ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[10px] text-white/90">{label.slice(0,1).toUpperCase()}</div>}
            </div>
            <div className="text-white/90 text-xs font-semibold max-w-[140px] truncate">{label}</div>
            <div className="flex items-center gap-2 ml-1">
              {onInvite && <button aria-label="Invite" onClick={(e)=>{e.stopPropagation(); onInvite(hover.id)}} className="px-2 py-1 rounded-md text-[11px]" style={{ background:t.base, color:t.fg }}>Invite</button>}
              {onDM && <button aria-label="DM" onClick={(e)=>{e.stopPropagation(); onDM(hover.id)}} className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80">DM</button>}
              {onAddToPlan && <button aria-label="Add to plan" onClick={(e)=>{e.stopPropagation(); onAddToPlan(hover.id)}} className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white/80">Add</button>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
function ellipsize(id:string,n=6){ return id.length>n ? id.slice(0,n)+'…' : id }