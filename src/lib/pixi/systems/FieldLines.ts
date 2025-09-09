import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Tier = 'low'|'mid'|'high'
type Zone = { polygon: [number,number][], prob: number, vibe: string }

type Path = { g: PIXI.Graphics; ptsLngLat: [number,number][]; color: number; alpha: number }

export class FieldLines {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private paths: Path[] = []
  private lines = 0
  private seed = Math.random()*1000

  constructor(opts?: { tier?: Tier }) {
    const tier = opts?.tier ?? 'mid'
    this.lines = tier === 'high' ? 16 : tier === 'mid' ? 10 : 0
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { this.stage = stage; this.map = map }
  onRemove() { for (const p of this.paths) p.g.destroy(true); this.paths = [] }

  onMessage(type: string, payload: any) {
    if (type !== 'zones') return
    const zones = (payload?.zones as Zone[]) ?? []
    for (const p of this.paths) p.g.destroy(true)
    this.paths = []
    if (this.lines === 0 || zones.length === 0) return

    // seed lines from centroids; drift outward using a cheap curl-ish function
    const cents = zones.map(z => this.centroid(z.polygon))
    const colors = zones.map(z => {
      const token = getVibeToken((z.vibe as any) ?? 'calm')
      return parseInt(token.base.replace('#', ''), 16) || 0xffffff
    })
    for (let i=0;i<this.lines;i++) {
      const idx = i % cents.length
      const start = cents[idx]
      const hue = colors[idx]
      const g = new PIXI.Graphics()
      g.blendMode = 'add' as any
      this.stage.addChild(g)
      const pts = this.trace(start, 14 + (i%5), 0.0035)
      this.paths.push({ g, ptsLngLat: pts, color: hue, alpha: 0.28 })
    }
  }

  onFrame(_dt: number, project: (lng:number,lat:number)=>{x:number;y:number}) {
    for (const p of this.paths) {
      const g = p.g; g.clear()
      g.lineStyle(1.6, p.color, p.alpha)
      let first = true
      for (const ll of p.ptsLngLat) {
        const xy = project(ll[0], ll[1])
        if (first){ g.moveTo(xy.x, xy.y); first=false } else g.lineTo(xy.x, xy.y)
      }
      // soft glow
      g.lineStyle(3.0, p.color, p.alpha*0.15)
      first = true
      for (const ll of p.ptsLngLat) {
        const xy = project(ll[0], ll[1])
        if (first){ g.moveTo(xy.x, xy.y); first=false } else g.lineTo(xy.x, xy.y)
      }
    }
  }

  // --- helpers ---
  private centroid(poly:[number,number][]) {
    let x=0,y=0; for (const p of poly) { x+=p[0]; y+=p[1] } return [x/poly.length, y/poly.length] as [number,number]
  }

  private curl(p:[number,number]) { // cheap drift
    const x = p[0]+this.seed, y = p[1]-this.seed*0.7
    const dx = Math.sin(x*80.0)*0.00008 + Math.cos(y*30.0)*0.00006
    const dy = Math.cos(x*60.0)*0.00006 - Math.sin(y*40.0)*0.00005
    return [dx, dy] as [number,number]
  }

  private trace(start:[number,number], steps:number, stepSize:number) {
    const pts: [number,number][] = []
    let p = start.slice() as [number,number]
    for (let s=0;s<steps;s++) {
      pts.push([p[0], p[1]])
      const v = this.curl(p)
      p = [
        p[0] + v[0] + (Math.random()-0.5)*stepSize*0.2,
        p[1] + v[1] + (Math.random()-0.5)*stepSize*0.2
      ]
    }
    return pts
  }
}