import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Tier = 'low'|'mid'|'high'
type Zone = { polygon: [number,number][], prob: number, vibe: string }

type Ring = { g: PIXI.Graphics; ringLngLat: [number,number][], inset: number; color: number; alpha: number; width: number }

export class GlassShells {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private rings: Ring[] = []
  private maxZones: number
  private ringsPerZone: number

  constructor(opts?: { tier?: Tier }) {
    const tier = opts?.tier ?? 'mid'
    this.maxZones = tier === 'high' ? 5 : tier === 'mid' ? 4 : 3
    this.ringsPerZone = tier === 'high' ? 3 : tier === 'mid' ? 2 : 1
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { this.stage = stage; this.map = map }
  onRemove() { for (const r of this.rings) r.g.destroy(true); this.rings = [] }

  onMessage(type: string, payload: any) {
    if (type !== 'zones') return
    const zones = (payload?.zones as Zone[]) ?? []

    // cleanup
    for (const r of this.rings) r.g.destroy(true)
    this.rings = []

    // build
    let z = 0
    for (const zone of zones) {
      if (z++ >= this.maxZones) break
      const t = getVibeToken((zone.vibe as any) ?? 'calm')
      const ringColor = parseInt(t.ring.replace('#', ''), 16) || 0xffffff
      const glowAlpha = 0.22 + 0.22 * Math.min(0.9, (zone.prob ?? 0.5))

      for (let i = 0; i < this.ringsPerZone; i++) {
        const g = new PIXI.Graphics()
        g.blendMode = 'add' as any
        this.stage.addChild(g)
        const inset = (i+1) * 0.00035  // degrees-ish; small inward offset
        const width = 2.5 - i * 0.7
        const alpha = glowAlpha * (1 - i*0.35)
        this.rings.push({
          g,
          ringLngLat: zone.polygon.slice(0, -1),
          inset,
          color: ringColor,
          alpha,
          width
        })
      }
    }
  }

  onFrame(_dt: number, project: (lng:number,lat:number)=>{x:number;y:number}) {
    // redraw each ring
    for (const r of this.rings) {
      const g = r.g; g.clear()
      g.lineStyle(r.width, r.color, r.alpha)

      // centroid for inward offset
      const [cx, cy] = this.centroid(r.ringLngLat)

      // Multi-stroke blur
      for (let k = -1; k <= 1; k++) {
        const off = k * 0.00008
        let first = true
        for (let i = 0; i < r.ringLngLat.length; i++) {
          const p = r.ringLngLat[i]
          // move a small fraction toward centroid (deg-friendly)
          const insetFrac = 0.06 // 6% toward center
          const qi = [
            p[0] + (cx - p[0]) * insetFrac + off,
            p[1] + (cy - p[1]) * insetFrac + off
          ] as [number, number]
          const pt = project(qi[0], qi[1])
          if (first) { g.moveTo(pt.x, pt.y); first = false } else g.lineTo(pt.x, pt.y)
        }
        // close
        const p0 = r.ringLngLat[0]
        const q0 = [
          p0[0] + (cx - p0[0]) * 0.06 + off,
          p0[1] + (cy - p0[1]) * 0.06 + off
        ] as [number, number]
        const pt0 = project(q0[0], q0[1])
        g.lineTo(pt0.x, pt0.y)
      }
    }
  }

  // --- helpers ---
  private centroid(poly:[number,number][]) {
    let x=0,y=0; for (const p of poly) { x+=p[0]; y+=p[1] } return [x/poly.length, y/poly.length] as [number,number]
  }
}