import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Payload = { centroid: [number, number]; text?: string; vibe?: string; durationMs?: number }

type Particle = { spr: PIXI.Sprite; angle: number; radius: number; speed: number; life: number }

export class PerfectStorm {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private time = 0
  private particles: Particle[] = []
  private label?: PIXI.Text
  private live = false
  private centerLngLat: [number, number] = [0,0]
  private duration = 5500 // ms
  private startAt = 0

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { this.stage = stage; this.map = map }
  onRemove() {
    for (const p of this.particles) p.spr.destroy()
    this.particles = []
    this.label?.destroy(); this.label = undefined
    this.live = false
  }

  onMessage(type: string, payload: Payload) {
    if (type !== 'perfect-storm') return
    this.onRemove() // reset
    this.centerLngLat = payload.centroid
    this.duration = Math.max(3000, Math.min(10000, payload.durationMs ?? 5500))
    const vibe = getVibeToken((payload.vibe as any) ?? 'hype')
    const gold = 0xffe08a

    // Particles: spiral outwards
    const N = 120
    for (let i=0;i<N;i++) {
      const spr = PIXI.Sprite.from(PIXI.Texture.WHITE)
      spr.anchor.set(0.5)
      spr.tint = gold
      spr.alpha = 0.0
      spr.width = 2; spr.height = 2
      spr.blendMode = 'add' as any
      this.stage.addChild(spr)
      this.particles.push({
        spr, angle: Math.random()*Math.PI*2,
        radius: 4 + Math.random()*8,
        speed: 0.045 + Math.random()*0.06,
        life: this.duration
      })
    }

    // Caption
    const txt = payload.text ?? 'Perfect convergence in ~5 min'
    const style = new PIXI.TextStyle({
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
      fontSize: 16, fontWeight: '600',
      fill: '#ffffff', 
      dropShadow: {
        blur: 4,
        alpha: 0.6,
        distance: 2,
        color: '#000000'
      }
    })
    this.label = new PIXI.Text(txt, style)
    this.label.alpha = 0
    this.stage.addChild(this.label)

    this.startAt = performance.now()
    this.live = true
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}) {
    if (!this.live) return
    this.time += dt
    const now = performance.now()
    const t = (now - this.startAt) / this.duration
    if (t >= 1) { this.onRemove(); return }

    const c = project(this.centerLngLat[0], this.centerLngLat[1])

    // particles: spiral + fade in/out
    for (let i=0;i<this.particles.length;i++) {
      const p = this.particles[i]
      p.angle += p.speed
      p.radius += 0.6
      const x = c.x + Math.cos(p.angle) * p.radius
      const y = c.y + Math.sin(p.angle) * p.radius
      p.spr.position.set(x, y)
      // alpha envelope
      const a = Math.min(1, Math.max(0, t < 0.5 ? t*2.0 : (1.0 - (t-0.5)*2.0)))
      p.spr.alpha = a * 0.9
    }

    // text hover above centroid
    if (this.label) {
      this.label.position.set(c.x + 16, c.y - 24)
      this.label.alpha = Math.min(1, t*2.0)
    }
  }
}