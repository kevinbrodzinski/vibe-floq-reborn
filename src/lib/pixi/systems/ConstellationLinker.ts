import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Zone = { polygon: [number, number][], prob: number, vibe: string }
type Star = { spr: PIXI.Sprite; centerLngLat: [number,number]; size: number; color: number }
type Link = { g: PIXI.Graphics; aLngLat: [number,number]; bLngLat: [number,number]; color: number; alpha: number }

export class ConstellationLinker {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private stars: Star[] = []
  private links: Link[] = []
  private time = 0
  private k = 2            // nearest neighbors per centroid
  private maxZones = 10    // perf cap

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) {
    this.stage = stage
    this.map = map
  }

  onRemove() {
    for (const s of this.stars) s.spr.destroy()
    for (const l of this.links) l.g.destroy()
    this.stars = []; this.links = []
  }

  onMessage(type: string, payload: any) {
    if (type !== 'zones') return
    const zones = Array.isArray(payload?.zones) ? payload.zones as Zone[] : (payload as Zone[])

    // cleanup old
    this.onRemove()

    // compute centroids (cap)
    const Z = zones.slice(0, this.maxZones)
    const cents: { c:[number,number]; t: ReturnType<typeof getVibeToken> }[] = []
    for (const z of Z) {
      if (!z?.polygon?.length) continue
      const c = this.centroid(z.polygon)
      cents.push({ c, t: getVibeToken((z.vibe as any) ?? 'calm') })
    }

    // stars
    for (const it of cents) {
      const spr = PIXI.Sprite.from(PIXI.Texture.WHITE)
      spr.anchor.set(0.5)
      spr.tint = 0xffffff
      spr.alpha = 0.9
      const size = 3.5
      spr.width = size; spr.height = size
      spr.blendMode = 'add'
      this.stage.addChild(spr)
      this.stars.push({ spr, centerLngLat: it.c, size, color: 0xffffff })
    }

    // links (k-nearest)
    const nn = this.knn(cents.map(x => x.c), this.k)
    for (let i=0;i<nn.length;i++) {
      const from = cents[i]; const nbrs = nn[i]
      for (const j of nbrs) {
        if (j <= i) continue // avoid duplicates
        const to = cents[j]
        const g = new PIXI.Graphics()
        g.blendMode = 'add'
        this.stage.addChild(g)
        const colorStr = to.t.ring.replace('#', '')
        const color = parseInt(colorStr, 16) || 0xffffff
        this.links.push({ g, aLngLat: from.c, bLngLat: to.c, color, alpha: 0.65 })
      }
    }
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}, zoom: number) {
    this.time += dt

    // twinkle stars
    for (let i=0;i<this.stars.length;i++) {
      const s = this.stars[i]
      const p = project(s.centerLngLat[0], s.centerLngLat[1])
      s.spr.position.set(p.x, p.y)
      const tw = 0.75 + 0.25 * Math.sin((this.time*0.006) + i*0.9)
      s.spr.alpha = tw
    }

    // redraw links
    for (let i=0;i<this.links.length;i++) {
      const l = this.links[i]
      const a = project(l.aLngLat[0], l.aLngLat[1])
      const b = project(l.bLngLat[0], l.bLngLat[1])
      const g = l.g
      g.clear()
      g.lineStyle(1.5, l.color, l.alpha)
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      // soft glow
      g.lineStyle(3.5, l.color, l.alpha*0.15)
      g.moveTo(a.x, a.y)
      g.lineTo(b.x, b.y)
      g.lineStyle()
    }
  }

  // ---- helpers ----
  private centroid(poly: [number,number][]) {
    let x=0,y=0; for (const p of poly) { x+=p[0]; y+=p[1] }
    return [x/poly.length, y/poly.length] as [number,number]
  }

  private knn(points: [number,number][], k: number) {
    const out: number[][] = []
    for (let i=0;i<points.length;i++) {
      const row: { j:number; d:number }[] = []
      for (let j=0;j<points.length;j++) if (j!==i) {
        const dx = points[i][0]-points[j][0], dy = points[i][1]-points[j][1]
        row.push({ j, d: dx*dx + dy*dy })
      }
      row.sort((a,b)=>a.d-b.d)
      out.push(row.slice(0,k).map(e=>e.j))
    }
    return out
  }
}