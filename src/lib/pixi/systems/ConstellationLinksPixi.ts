import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Tier = 'low'|'mid'|'high'
type Node = { id: string; pos: [number, number]; mass?: number; vibe?: string } // 0..1
type Edge = { a: string; b: string; strength: number; lastSync?: string }

type LinkRec = {
  g: PIXI.Graphics
  aId: string
  bId: string
  width: number
  steps: number
  colors: number[]    // precomputed gradient (numeric)
  alphas: number[]    // per-pass alpha
  widths: number[]    // per-pass width
}
type Star = { spr: PIXI.Sprite; id: string }

export class ConstellationLinksPixi {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private links: LinkRec[] = []
  private stars: Star[] = []
  private nodes: Node[] = []
  private edges: Edge[] = []
  private maxEdges: number

  constructor(opts?: { tier?: Tier; maxEdges?: number }) {
    const tier = opts?.tier ?? 'mid'
    this.maxEdges = opts?.maxEdges ?? (tier === 'high' ? 60 : tier === 'mid' ? 36 : 20)
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { this.stage = stage; this.map = map }

  onRemove() {
    for (const L of this.links) L.g.destroy(true)
    for (const S of this.stars) S.spr.destroy(true)
    this.links = []; this.stars = []; this.nodes = []; this.edges = []
  }

  onMessage(type: string, payload: any) {
    if (type !== 'constellation-graph') return
    const nodes: Node[] = Array.isArray(payload?.nodes) ? payload.nodes : []
    const edges: Edge[] = Array.isArray(payload?.edges) ? payload.edges : []
    this.rebuild(nodes, edges)
  }

  private rebuild(nodes: Node[], edges: Edge[]) {
    // cleanup
    this.onRemove()
    this.nodes = nodes
    this.edges = edges.slice(0, this.maxEdges)

    // stars (additive)
    for (const n of nodes) {
      const spr = PIXI.Sprite.from(PIXI.Texture.WHITE)
      spr.anchor.set(0.5); spr.tint = 0xffffff; spr.alpha = 0.92
      const size = 3.5 + ((n.mass ?? 1) * 1.5)
      spr.width = size; spr.height = size
      spr.blendMode = 'add' as any
      this.stage.addChild(spr)
      this.stars.push({ spr, id: n.id })
    }

    // links — multi-pass gradient via layered strokes
    const STEPS = 5
    for (const e of this.edges) {
      const a = nodes.find(n => n.id === e.a); const b = nodes.find(n => n.id === e.b)
      if (!a || !b) continue

      const s = Math.max(0.1, Math.min(1, e.strength))
      const g = new PIXI.Graphics()
      g.blendMode = 'add' as any
      this.stage.addChild(g)

      const ta = getVibeToken((a.vibe as any) ?? 'calm')
      const tb = getVibeToken((b.vibe as any) ?? 'calm')

      const cols: number[] = []
      const alphas: number[] = []
      const widths: number[] = []
      for (let i = 0; i < STEPS; i++) {
        const t = i / (STEPS - 1)
        cols.push(interpHex(ta.ring, tb.ring, t))
        alphas.push((0.25 + 0.65 * s) * (1 - i * 0.15))
        widths.push((1 + 2 * s) * (1 - i * 0.2))
      }

      this.links.push({
        g, aId: a.id, bId: b.id,
        width: 1 + 2*s, steps: STEPS,
        colors: cols, alphas, widths
      })
    }
  }

  onFrame(_dt: number, _project: (lng:number,lat:number)=>{x:number;y:number}) {
    const w = (this.map as any).getContainer()?.clientWidth || 1024
    const h = (this.map as any).getContainer()?.clientHeight || 768

    // stars
    for (const s of this.stars) {
      const n = this.nodes.find(nn => nn.id === s.id); if (!n) continue
      s.spr.position.set(n.pos[0]*w, n.pos[1]*h)
    }

    // links
    for (const L of this.links) {
      const a = this.nodes.find(n => n.id === L.aId)
      const b = this.nodes.find(n => n.id === L.bId)
      if (!a || !b) continue
      const ax = a.pos[0]*w, ay = a.pos[1]*h
      const bx = b.pos[0]*w, by = b.pos[1]*h

      const g = L.g
      g.clear()

      for (let i=0;i<L.steps;i++) {
        g.lineStyle(L.widths[i], L.colors[i], L.alphas[i])
        g.moveTo(ax, ay); g.lineTo(bx, by)
      }
    }
  }
}

// hex → number interpolation once, not per-frame
function interpHex(a: string, b: string, t: number) {
  const [r1,g1,b1] = hexToRgb(a); const [r2,g2,b2] = hexToRgb(b)
  const r = Math.round(r1 + (r2-r1)*t)
  const g = Math.round(g1 + (g2-g1)*t)
  const bl = Math.round(b1 + (b2-b1)*t)
  return (r<<16) | (g<<8) | bl
}
function hexToRgb(hex: string): [number,number,number] {
  const s = hex.startsWith('#') ? hex.slice(1) : hex
  const h = s.length===3 ? s.split('').map(c=>c+c).join('') : s
  return [ parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16) ]
}