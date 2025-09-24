// src/lib/map/pixi/systems/LightningSystem.ts
import * as PIXI from 'pixi.js'
import type { AtmoSystem } from '../PixiCustomLayer'
import type { PressureCell } from '@/lib/api/mapContracts'
import { brand } from '@/lib/tokens/brand'

type Bolt = {
  g: PIXI.Graphics
  life: number   // ms remaining
  active: boolean
  lngLatA: [number, number]
  lngLatB: [number, number]
}

export type LightningOptions = {
  colorHex?: string
  maxBoltsPerFrame?: 0|1|2
  poolSize?: number
  lifetimeMs?: number
}

function hexToPixi(hex: string) {
  const s = hex.startsWith('#') ? hex.slice(1) : hex
  return parseInt(s, 16)
}

export class LightningSystem implements AtmoSystem {
  private layer = new PIXI.Container()
  private bolts: Bolt[] = []
  private color: number
  private poolSize: number
  private lifetime: number
  private maxPerFrame: 0|1|2
  private hot: [number, number][] = [] // top cell lng/lat

  constructor(opts: LightningOptions = {}) {
    this.color = hexToPixi(opts.colorHex ?? brand.accent)
    this.poolSize = Math.max(2, Math.min(12, opts.poolSize ?? 6))
    this.lifetime = Math.max(120, Math.min(600, opts.lifetimeMs ?? 220))
    this.maxPerFrame = (opts.maxBoltsPerFrame ?? 1)
  }

  onAdd(stage: PIXI.Container) {
    stage.addChild(this.layer)
    // pre-create graphics
    for (let i = 0; i < this.poolSize; i++) {
      const g = new PIXI.Graphics()
      g.alpha = 0
      this.layer.addChild(g)
      this.bolts.push({ g, life: 0, active: false, lngLatA: [0,0], lngLatB: [0,0] })
    }
  }

  onUpdateCells(cells: PressureCell[]) {
    // choose hot anchors (top pressure cells)
    const sorted = [...cells].sort((a,b)=>b.pressure - a.pressure)
    const n = Math.min(4, sorted.length)
    this.hot = new Array(n).fill(0).map((_,i)=>[sorted[i].center[0], sorted[i].center[1]])
  }

  private drawBolt(g: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number) {
    g.clear()
    g.stroke({ color: this.color, width: 2, alpha: 0.95 })
    const segs = 6
    g.moveTo(x1, y1)
    for (let i = 1; i < segs; i++) {
      const t = i / segs
      const xi = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 6
      const yi = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 6
      g.lineTo(xi, yi)
    }
    g.lineTo(x2, y2)
  }

  private spawnBolt(project: (lng:number,lat:number)=>{x:number;y:number}) {
    const slot = this.bolts.find(b => !b.active)
    if (!slot || this.hot.length < 1) return

    const a = this.hot[Math.floor(Math.random() * this.hot.length)] as [number,number]
    // jitter end point within ~120–240m equivalent
    const ang = Math.random() * Math.PI * 2
    const dist = 0.0012 + Math.random() * 0.0012
    const b: [number, number] = [a[0] + Math.cos(ang)*dist, a[1] + Math.sin(ang)*dist]

    slot.lngLatA = a
    slot.lngLatB = b
    slot.life = this.lifetime
    slot.active = true

    const pa = project(a[0], a[1])
    const pb = project(b[0], b[1])
    this.drawBolt(slot.g, pa.x, pa.y, pb.x, pb.y)
    slot.g.alpha = 0.9
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}) {
    // chance to spawn up to maxPerFrame
    for (let i=0; i<this.maxPerFrame; i++) {
      if (Math.random() < 0.01) this.spawnBolt(project) // 1% chance per frame
    }

    for (const b of this.bolts) {
      if (!b.active) continue
      b.life -= dt
      const a = project(b.lngLatA[0], b.lngLatA[1])
      const c = project(b.lngLatB[0], b.lngLatB[1])
      this.drawBolt(b.g, a.x, a.y, c.x, c.y)
      b.g.alpha = Math.max(0, b.life / this.lifetime)
      if (b.life <= 0) { b.active = false; b.g.alpha = 0 }
    }
  }

  onRemove() {
    for (const b of this.bolts) b.g.destroy()
    this.bolts.length = 0
    this.layer.destroy({ children: true })
  }
}