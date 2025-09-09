import * as PIXI from 'pixi.js'
import type { PressureCell } from '@/lib/api/mapContracts'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Tier = 'low' | 'mid' | 'high'
type Horizon = 'now' | 'p30' | 'p120'
type CellRec = {
  mesh: PIXI.Graphics
  centerLngLat: [number, number]
  radius: number
  coreCol: Float32Array
  edgeCol: Float32Array
  specCol: Float32Array
  opacity: number
  facets: number
  shimmer: number
  mode: number // 0 now, 1 p30, 2 p120
}

export class TimeCrystal {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private time = 0
  private segs: number
  private maxCells: number
  private data: { now: CellRec[]; p30: CellRec[]; p120: CellRec[] } = { now: [], p30: [], p120: [] }
  private active: Horizon | null = null

  constructor(opts?: { tier?: Tier; segs?: number; maxCells?: number }) {
    const tier = opts?.tier ?? 'mid'
    this.segs     = opts?.segs     ?? (tier === 'high' ? 18 : tier === 'mid' ? 14 : 10)
    this.maxCells = opts?.maxCells ?? (tier === 'high' ? 60 : tier === 'mid' ? 36 : 20)
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { 
    this.stage = stage
    this.map = map 
  }
  
  onRemove() {
    const all = [...this.data.now, ...this.data.p30, ...this.data.p120]
    for (const r of all) r.mesh.destroy()
    this.data = { now: [], p30: [], p120: [] }
  }

  onMessage(type: string, payload: any) {
    if (type !== 'temporal') return
    if (payload?.now || payload?.p30 || payload?.p120) {
      if (payload.now)  this.data.now  = this.build(payload.now as PressureCell[], 'now')
      if (payload.p30)  this.data.p30  = this.build(payload.p30 as PressureCell[], 'p30')
      if (payload.p120) this.data.p120 = this.build(payload.p120 as PressureCell[], 'p120')
      if (!this.active) this.active = 'p30'
      return
    }
    if (payload?.horizon && payload?.cells) {
      const h = payload.horizon as Horizon
      this.data[h] = this.build(payload.cells as PressureCell[], h)
      this.active ??= h
    }
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}, zoom: number) {
    this.time += dt

    const activeList = this.active ? this.data[this.active] : []
    for (const rec of activeList) {
      const p = project(rec.centerLngLat[0], rec.centerLngLat[1])
      
      // Update crystal position and visual effects
      rec.mesh.position.set(p.x, p.y)
      
      // Redraw crystal with enhanced effects
      this.drawEnhancedCrystal(rec, zoom)
    }
  }

  // ---------- build ----------

  private build(cells: PressureCell[], h: Horizon): CellRec[] {
    // clear old horizon
    for (const r of this.data[h]) r.mesh.destroy()

    const out: CellRec[] = []
    const list = cells.slice(0, this.maxCells)
    for (const c of list) {
      const radius = 10 + (c.pressure ?? 0.5) * 28 // px baseline
      const { coreCol, edgeCol, specCol } = this.paletteFor(h)
      const opacity = h === 'now' ? 1.0 : h === 'p30' ? 0.78 : 0.5
      const facets  = h === 'now' ? 14 : h === 'p30' ? 10 : 7
      const shimmer = h === 'p30' ? 1.0 : (h === 'p120' ? 0.6 : 0.0)
      const mode = h === 'now' ? 0 : h === 'p30' ? 1 : 2

      const mesh = new PIXI.Graphics()
      mesh.blendMode = 'add'
      this.stage.addChild(mesh)

      out.push({
        mesh,
        centerLngLat: c.center as [number, number],
        radius, coreCol, edgeCol, specCol,
        opacity, facets, shimmer, mode
      })
    }
    return out
  }

  private drawEnhancedCrystal(rec: CellRec, zoom: number) {
    const g = rec.mesh
    g.clear()

    // Create faceted crystal shape with enhanced effects
    const step = (Math.PI * 2) / this.segs
    const points: { x: number; y: number }[] = []
    
    for (let i = 0; i < this.segs; i++) {
      const a = i * step
      // facet jag: harmonic mix → crystalline look
      const jag = 1.0
        + 0.22 * Math.cos(a * rec.facets)
        + 0.12 * Math.sin(a * (rec.facets * 0.5 + 1.0))
      // horizon shimmer for +30m; subtle for +2h
      const shimAmp = rec.mode === 1 ? 0.05 : rec.mode === 2 ? 0.025 : 0.0
      const shim = 1.0 + rec.shimmer * (shimAmp * Math.sin(a*3.0 + this.time*0.005))
      const r = rec.radius * jag * shim

      points.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r
      })
    }

    // Draw core with primary color
    const coreColor = this.vec4ToHex(rec.coreCol)
    const edgeColor = this.vec4ToHex(rec.edgeCol)
    const specColor = this.vec4ToHex(rec.specCol)
    
    // Core fill
    g.beginFill(coreColor, rec.opacity * 0.6)
    g.drawPolygon(points.flatMap(p => [p.x, p.y]))
    g.endFill()

    // Edge highlight
    g.lineStyle(2, edgeColor, rec.opacity * 0.8)
    g.drawPolygon(points.flatMap(p => [p.x, p.y]))
    g.lineStyle()

    // Specular glints at vertices
    for (let i = 0; i < points.length; i += 3) { // Every 3rd vertex
      const p = points[i]
      const glintAlpha = rec.opacity * 0.4 * (0.7 + 0.3 * Math.sin(this.time * 0.003 + i))
      g.beginFill(specColor, glintAlpha)
      g.drawCircle(p.x, p.y, 2)
      g.endFill()
    }

    // Rim lighting effect
    g.lineStyle(1, edgeColor, rec.opacity * 0.3)
    const rimRadius = rec.radius * 1.1
    g.drawCircle(0, 0, rimRadius)
    g.lineStyle()

    // fade slightly with high zoom to reduce bloom blowout
    g.alpha = zoom >= 15 ? 0.95 : 0.85
  }

  private paletteFor(h: Horizon) {
    // Choose vibe-driven colors; you can wire to current vibe later.
    const tv = h === 'now' ? getVibeToken('hype' as any)
         : h === 'p30' ? getVibeToken('romance' as any)
         : getVibeToken('focus' as any)
    // core = glow, edge = ring, spec = base (for highlights)
    return {
      coreCol: this.cssToVec4(tv.glow),
      edgeCol: this.cssToVec4(tv.ring),
      specCol: this.cssToVec4(tv.base),
    }
  }

  private cssToVec4(c: string) {
    if (c.startsWith('#')) {
      let r=0,g=0,b=0
      if (c.length === 7) { r = parseInt(c.slice(1,3),16); g = parseInt(c.slice(3,5),16); b = parseInt(c.slice(5,7),16) }
      else if (c.length === 4) { r = parseInt(c[1]+c[1],16); g = parseInt(c[2]+c[2],16); b = parseInt(c[3]+c[3],16) }
      return new Float32Array([r/255,g/255,b/255,1])
    }
    const m = c.match(/rgba?\(([^)]+)\)/i)
    if (m) {
      const parts = m[1].split(',').map(s => +s.trim())
      const [r,g,b,a=1] = parts
      return new Float32Array([r/255,g/255,b/255,Math.max(0, Math.min(1,a))])
    }
    return new Float32Array([1,1,1,1])
  }

  private vec4ToHex(vec: Float32Array): number {
    const r = Math.round(vec[0] * 255)
    const g = Math.round(vec[1] * 255)
    const b = Math.round(vec[2] * 255)
    return (r << 16) | (g << 8) | b
  }
}