import * as PIXI from 'pixi.js'

type Tier = 'low'|'mid'|'high'
type Payload = {
  centroid: [number, number]              // [lng, lat] (coarse)
  colors?: [string, string, string]       // hex or rgba; optional
  durationMs?: number                     // default ~12s
  ribbons?: number                        // override ribbon count
}

type RingRec = {
  mesh: PIXI.Graphics
  ringLngLat: [number, number][]
  centerLngLat: [number, number]
}

export class RareAurora {
  private stage!: PIXI.Container
  private map!: any // mapboxgl.Map-ish
  private time = 0
  private live = false
  private startAt = 0
  private duration = 12000
  private segments: number
  private ribbons: number
  private amplitude: number
  private speed: number
  private rings: RingRec[] = []

  constructor(opts?: { tier?: Tier; segments?: number; ribbons?: number; amplitude?: number; speed?: number }) {
    const tier = opts?.tier ?? 'mid'
    this.segments  = opts?.segments  ?? (tier === 'high' ? 34 : tier === 'mid' ? 28 : 22)
    this.ribbons   = opts?.ribbons   ?? (tier === 'high' ? 4  : tier === 'mid' ? 3  : 2)
    this.amplitude = opts?.amplitude ?? (tier === 'high' ? 0.75 : tier === 'mid' ? 0.6 : 0.45)
    this.speed     = opts?.speed     ?? 0.00055
  }

  onAdd(stage: PIXI.Container, map: any) { this.stage = stage; this.map = map }
  onRemove() {
    for (const r of this.rings) r.mesh.destroy(true)
    this.rings = []
    this.live = false
  }

  // Trigger: layer.emit('rare-aurora', { centroid, colors?, durationMs?, ribbons? })
  onMessage(type: string, payload: Payload) {
    if (type !== 'rare-aurora') return
    this.onRemove()

    const centroid = payload?.centroid
    if (!centroid || centroid.length !== 2) return

    const colors = payload?.colors ?? ['#b26bff', '#5fe9ff', '#52ff8f'] // purple, cyan, green

    this.duration = Math.max(5000, Math.min(20000, payload?.durationMs ?? 12000))
    const ribbons = Math.max(1, payload?.ribbons ?? this.ribbons)

    // Build graphics-based aurora around the centroid
    const ring = this.makeDegreeRing(centroid, 0.0015, this.segments) // ~150m; coarse
    
    const g = new PIXI.Graphics()
    g.blendMode = 'add' as any
    this.stage.addChild(g)

    this.rings.push({ mesh: g, ringLngLat: ring, centerLngLat: centroid })
    this.startAt = performance.now()
    this.time = 0
    this.live = true
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}) {
    if (!this.live || !this.rings.length) return

    const now = performance.now()
    const tNorm = (now - this.startAt) / this.duration
    if (tNorm >= 1) { this.onRemove(); return }

    this.time += dt

    for (const r of this.rings) {
      const g = r.mesh as PIXI.Graphics
      g.clear()

      // Draw aurora ribbons using the ring points
      const centerPt = project(r.centerLngLat[0], r.centerLngLat[1])
      const ringPts = r.ringLngLat.map(p => project(p[0], p[1]))

      // Draw ribbons with color cycling
      for (let i = 0; i < this.ribbons; i++) {
        const colorIndex = Math.floor((i / this.ribbons + tNorm) * 3) % 3
        const colors = ['#b26bff', '#5fe9ff', '#52ff8f']
        const color = parseInt(colors[colorIndex].slice(1), 16)
        
        const alpha = 0.3 + 0.4 * Math.sin(this.time * this.speed + i * 0.9)
        const width = 2 + i * 0.5
        
        g.lineStyle(width, color, Math.max(0, alpha))
        g.moveTo(centerPt.x, centerPt.y)
        
        // Draw flowing lines to ring points
        for (let j = 0; j < ringPts.length; j += 3) {
          const pt = ringPts[j]
          if (pt) g.lineTo(pt.x, pt.y)
        }
      }
    }
  }

  // ---- helpers ----

  private makeDegreeRing(center:[number,number], degLat:number, segs:number) {
    const [lng0, lat0] = center
    const degLng = degLat / Math.max(0.2, Math.cos(lat0 * Math.PI/180))
    const out: [number,number][] = []
    for (let i=0;i<segs;i++) {
      const a = (i/segs) * Math.PI*2
      out.push([ lng0 + Math.cos(a)*degLng, lat0 + Math.sin(a)*degLat ])
    }
    return out
  }
}