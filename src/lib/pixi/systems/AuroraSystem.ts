import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Zone = { polygon: [number, number][], prob: number, vibe: string }
type Tier = 'low' | 'mid' | 'high'

type MeshRec = {
  mesh: PIXI.Mesh
  ringLngLat: [number, number][]
  centerLngLat: [number, number]
  prob: number
  vibe: string
}

export class AuroraSystem {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private meshes: MeshRec[] = []
  private time = 0
  private maxZones: number
  private segments: number
  private ribbons: number
  private speed: number
  private amplitude: number
  private quality: number
  private parallax: number
  private bandShift: number

  constructor(opts?: { tier?: Tier; ribbons?: number; speed?: number; amplitude?: number; quality?: number; parallax?: number; bandShift?: number }) {
    const tier = opts?.tier ?? 'mid'
    // Safe defaults per tier
    this.maxZones  = tier === 'high' ? 5 : tier === 'mid' ? 4 : 3
    this.segments  = tier === 'high' ? 28 : tier === 'mid' ? 22 : 16
    this.ribbons   = Math.max(1, Math.floor(opts?.ribbons ?? (tier === 'high' ? 3 : tier === 'mid' ? 2 : 1)))
    this.speed     = opts?.speed ?? 0.00045
    this.amplitude = opts?.amplitude ?? (tier === 'high' ? 0.65 : tier === 'mid' ? 0.52 : 0.4)
    this.quality   = opts?.quality ?? (tier === 'high' ? 1.0 : tier === 'mid' ? 0.8 : 0.6) // noise step density
    this.parallax  = opts?.parallax ?? 0.06
    this.bandShift = opts?.bandShift ?? 0.12
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) {
    this.stage = stage
    this.map = map
  }

  onRemove() {
    for (const r of this.meshes) r.mesh.destroy()
    this.meshes = []
  }

  // React → layer.emit('zones', { zones })
  onMessage(type: string, payload: unknown) {
    if (type !== 'zones') return
    const zones = Array.isArray((payload as any)?.zones) ? (payload as any).zones as Zone[] : (payload as Zone[])

    // clear old
    for (const r of this.meshes) r.mesh.destroy()
    this.meshes = []

    // build new (cap for perf)
    let n = 0
    for (const z of zones ?? []) {
      if (n >= this.maxZones) break
      if (!z?.polygon?.length) continue

      const ring = this.resampleRing(z.polygon, this.segments)
      const center = this.centroid(ring)

      // derive colors from vibe tokens (base/glow/ring)
      const t = getVibeToken((z.vibe as any) ?? 'hype')
      const colA = this.colorToVec4(t.base)
      const colB = this.colorToVec4(t.glow)
      const colC = this.colorToVec4(t.ring)

      const { verts, uvs, indices } = this.triangleFan(center, ring)
      
      // Create simple graphics for compatibility
      const graphics = new PIXI.Graphics()
      graphics.beginFill(parseInt(t.glow.replace('#', ''), 16), 0.3)
      
      // Draw polygon from ring
      graphics.moveTo(ring[0][0], ring[0][1])
      for (let i = 1; i < ring.length; i++) {
        graphics.lineTo(ring[i][0], ring[i][1])
      }
      graphics.closePath()
      graphics.endFill()
      
      this.stage.addChild(graphics)
      
      this.meshes.push({ 
        mesh: graphics as any, 
        ringLngLat: ring, 
        centerLngLat: center, 
        prob: z.prob ?? 0.5, 
        vibe: z.vibe ?? 'hype' 
      })
      n++
    }
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}, zoom: number) {
    if (!this.meshes.length) return
    this.time += dt

    for (const r of this.meshes) {
      const { mesh, centerLngLat } = r
      const c = project(centerLngLat[0], centerLngLat[1])
      
      // Update position and animate
      mesh.position.set(c.x, c.y)
      mesh.alpha = 0.3 + 0.4 * r.prob * (0.8 + 0.2 * Math.sin(this.time * 0.002))
    }
  }

  // -------- helpers --------

  private resampleRing(ring: [number,number][], segs: number) {
    const P = ring[0][0] === ring[ring.length-1][0] && ring[0][1] === ring[ring.length-1][1]
      ? ring.slice(0, -1) : ring.slice()
    const N = Math.max(8, Math.min(64, segs))
    const out: [number,number][] = []
    for (let i=0;i<N;i++) {
      const t = i / N
      const idx = Math.floor(t * P.length)
      out.push(P[Math.min(idx, P.length-1)])
    }
    return out
  }

  private centroid(poly: [number,number][]) {
    let x=0,y=0; for (const p of poly) { x+=p[0]; y+=p[1] }
    return [x/poly.length, y/poly.length] as [number,number]
  }

  private triangleFan(centerLngLat: [number,number], ring: [number,number][]) {
    const n = ring.length
    const verts = new Float32Array((n+1)*2)
    const uvs   = new Float32Array((n+1)*2)
    const idx: number[] = []
    uvs[0] = 0.5; uvs[1] = 0.5
    for (let i=0;i<n;i++) {
      const a = (i / n) * Math.PI*2
      uvs[(i+1)*2+0] = 0.5 + Math.cos(a)*0.5
      uvs[(i+1)*2+1] = 0.5 + Math.sin(a)*0.5
    }
    for (let i=0;i<n-1;i++) idx.push(0, i+1, i+2)
    idx.push(0, n, 1)
    return { verts, uvs, indices: new Uint16Array(idx) }
  }

  private colorToVec4(c: string) {
    // supports #RRGGBB, #RGB, rgba(), rgb()
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
}