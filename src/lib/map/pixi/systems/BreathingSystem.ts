import * as PIXI from 'pixi.js'
import type { AtmoSystem } from '../PixiCustomLayer'
import type { PressureCell } from '@/lib/api/mapContracts'
import { brand } from '@/lib/tokens/brand'

type Rec = { spr: PIXI.Sprite; lng: number; lat: number; p: number; alive: boolean }

export type BreathingOptions = {
  colorHex?: string
  maxParticles?: number   // upper bound; actual driven by input
  minAlpha?: number       // 0.08..0.4
  maxAlpha?: number       // 0.2..0.7
}

function hexToPixi(hex: string) {
  const s = hex.startsWith('#') ? hex.slice(1) : hex
  return parseInt(s, 16)
}

export class BreathingSystem implements AtmoSystem {
  private container!: PIXI.ParticleContainer
  private pool: Rec[] = []
  private live: Rec[] = []
  private color: number
  private maxParticles: number
  private minA: number
  private maxA: number

  constructor(opts: BreathingOptions = {}) {
    this.color = hexToPixi(opts.colorHex ?? brand.primary)
    this.maxParticles = Math.max(16, Math.min(600, opts.maxParticles ?? 240))
    this.minA = Math.max(0.06, Math.min(0.4, opts.minAlpha ?? 0.12))
    this.maxA = Math.max(this.minA + 0.05, Math.min(0.8, opts.maxAlpha ?? 0.38))
  }

  onAdd(stage: PIXI.Container) {
    this.container = new PIXI.ParticleContainer()
    stage.addChild(this.container)
    // pre-warm pool
    for (let i = 0; i < Math.min(48, this.maxParticles); i++) {
      const spr = PIXI.Sprite.from(PIXI.Texture.WHITE)
      spr.anchor.set(0.5)
      spr.tint = this.color
      spr.alpha = 0
      spr.visible = false
      this.container.addChild(spr)
      this.pool.push({ spr, lng: 0, lat: 0, p: 0, alive: false })
    }
  }

  onUpdateCells(cells: PressureCell[], zoom: number) {
    const need = Math.min(this.maxParticles, cells.length)
    // expand pool if needed
    while (this.pool.length + this.live.length < need) {
      const spr = PIXI.Sprite.from(PIXI.Texture.WHITE)
      spr.anchor.set(0.5)
      spr.tint = this.color
      spr.alpha = 0
      spr.visible = false
      this.container.addChild(spr)
      this.pool.push({ spr, lng: 0, lat: 0, p: 0, alive: false })
    }

    // recycle current
    for (const r of this.live) { r.alive = false; r.spr.visible = false; this.pool.push(r) }
    this.live.length = 0

    // take first N cells (stable order is fine; upstream already budgets)
    for (let i = 0; i < need; i++) {
      const c = cells[i]
      const r = this.pool.pop()!
      r.lng = c.center[0]; r.lat = c.center[1]; r.p = c.pressure; r.alive = true
      r.spr.visible = true
      // base size by pressure + zoom
      const base = 3 + c.pressure * 10
      const zf = Math.min(2, Math.max(1, (zoom - 10) * 0.15 + 1))
      const s = base * zf
      r.spr.scale.set(s, s)
      // initial alpha
      r.spr.alpha = this.minA + 0.2 * c.pressure
      this.live.push(r)
    }
  }

  onFrame(dt: number, project: (lng: number, lat: number) => { x: number; y: number }) {
    if (!this.live.length) return
    const t = (Date.now() % 4000) / 4000 // 0..1
    for (let i = 0; i < this.live.length; i++) {
      const r = this.live[i]
      if (!r.alive) continue
      const { x, y } = project(r.lng, r.lat)
      r.spr.position.set(x, y)
      // breathing alpha: ease in/out around baseline, scaled by pressure
      const breath = 0.5 + 0.5 * Math.sin((t + (i % 7) * 0.13) * Math.PI * 2)
      const a = this.minA + (this.maxA - this.minA) * (0.3 + 0.7 * r.p) * breath
      r.spr.alpha = Math.min(this.maxA, Math.max(this.minA, a))
    }
  }

  onRemove() {
    for (const r of this.live) r.spr.destroy()
    for (const r of this.pool) r.spr.destroy()
    this.live.length = 0
    this.pool.length = 0
    this.container?.destroy({ children: true })
  }
}