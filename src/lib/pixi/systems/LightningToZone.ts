import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Pair = { from: [number,number] } // coarse origin (centroid of a friend cluster)
type Payload = { centroid: [number,number]; etaMin: number; pairs: Pair[]; vibe?: string }

type Bolt = { g: PIXI.Graphics; a: [number,number]; b: [number,number]; life: number; color: number }

export class LightningToZone {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private bolts: Bolt[] = []
  private maxPerFrame = 2

  constructor(opts?: { maxBoltsPerFrame?: 0|1|2 }) {
    this.maxPerFrame = opts?.maxBoltsPerFrame ?? 1
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { this.stage = stage; this.map = map }
  onRemove() { for (const b of this.bolts) b.g.destroy(true); this.bolts = [] }

  onMessage(type: string, payload: Payload) {
    if (type !== 'lightning') return
    const { centroid, etaMin, pairs, vibe } = payload || {}
    if (!centroid || !pairs?.length) return
    if (etaMin == null || etaMin > 5) return // trigger only when close

    const token = getVibeToken((vibe as any) ?? 'focus')
    const c = parseInt(token.ring.replace('#', ''), 16) || 0x88ccff
    // spawn up to maxPerFrame
    const count = Math.min(this.maxPerFrame, pairs.length)
    for (let i = 0; i < count; i++) {
      const from = pairs[i].from
      const g = new PIXI.Graphics()
      g.blendMode = 'add' as any
      this.stage.addChild(g)
      this.bolts.push({
        g,
        a: from,
        b: centroid,
        life: 240 + Math.random()*120,
        color: c // ring color computed earlier
      })
    }
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}) {
    for (let i=this.bolts.length-1;i>=0;i--) {
      const b = this.bolts[i]
      b.life -= dt
      const pA = project(b.a[0], b.a[1])
      const pC = project(b.b[0], b.b[1])
      const g = b.g; g.clear()

      // Sine-jag polyline
      const segs = 7
      const dx = (pC.x - pA.x) / segs
      const dy = (pC.y - pA.y) / segs
      g.lineStyle(2, b.color, Math.max(0, Math.min(1, b.life/360)))
      g.moveTo(pA.x, pA.y)
      for (let s=1;s<segs;s++) {
        const nx = pA.x + dx*s + (Math.random()-0.5)*8
        const ny = pA.y + dy*s + (Math.random()-0.5)*8
        g.lineTo(nx, ny)
      }
      g.lineTo(pC.x, pC.y)

      // Glow pass
      g.lineStyle(4, b.color, Math.max(0, Math.min(1, b.life/360)) * 0.18)
      g.moveTo(pA.x, pA.y)
      for (let s=1;s<segs;s++) {
        const nx = pA.x + dx*s + (Math.random()-0.5)*8
        const ny = pA.y + dy*s + (Math.random()-0.5)*8
        g.lineTo(nx, ny)
      }
      g.lineTo(pC.x, pC.y)

      if (b.life <= 0) { b.g.destroy(true); this.bolts.splice(i,1) }
    }
  }
}