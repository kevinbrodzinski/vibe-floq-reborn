import * as PIXI from 'pixi.js'
import { getVibeToken } from '@/lib/tokens/vibeTokens'

type Tier = 'low'|'mid'|'high'
type Node = { id: string; pos: [number, number]; mass?: number; vibe?: string } // pos in 0..1 screen space
type Edge = { a: string; b: string; strength: number; lastSync?: string }

type LinkRec = {
  graphics: PIXI.Graphics
  aId: string
  bId: string
  colorA: string
  colorB: string
  strength: number
}
type Star = { spr: PIXI.Sprite; id: string; size: number; color: number }

export class ConstellationLinksPixi {
  private stage!: PIXI.Container
  private map!: mapboxgl.Map
  private links: LinkRec[] = []
  private stars: Star[] = []
  private nodes: Node[] = []
  private edges: Edge[] = []
  private maxEdges: number
  private feather: number

  constructor(opts?: { tier?: Tier; maxEdges?: number; feather?: number }) {
    const tier = opts?.tier ?? 'mid'
    this.maxEdges = opts?.maxEdges ?? (tier === 'high' ? 60 : tier === 'mid' ? 36 : 20)
    this.feather  = Math.max(0.5, Math.min(2.5, opts?.feather ?? 1.2))
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) {
    this.stage = stage
    this.map = map
  }

  onRemove() {
    for (const L of this.links) L.graphics.destroy(true)
    for (const S of this.stars) S.spr.destroy(true)
    this.links = []; this.stars = []; this.nodes = []; this.edges = []
  }

  // Emit from React when you fetch constellation graph:
  // pixi.emit('constellation-graph', { nodes, edges })
  onMessage(type: string, payload: any) {
    if (type !== 'constellation-graph') return
    const nodes: Node[] = Array.isArray(payload?.nodes) ? payload.nodes : []
    const edges: Edge[] = Array.isArray(payload?.edges) ? payload.edges : []
    this.rebuild(nodes, edges)
  }

  private rebuild(nodes: Node[], edges: Edge[]) {
    // cleanup
    for (const L of this.links) L.graphics.destroy(true)
    for (const S of this.stars) S.spr.destroy(true)
    this.links = []; this.stars = []; this.nodes = nodes; this.edges = edges.slice(0, this.maxEdges)

    // stars per node (small coronas)
    for (const n of nodes) {
      const t = getVibeToken((n.vibe as any) ?? 'calm')
      const spr = PIXI.Sprite.from(PIXI.Texture.WHITE)
      spr.anchor.set(0.5)
      spr.tint = 0xffffff
      spr.alpha = 0.92
      const size = 3.5 + ((n.mass ?? 1) * 1.5)
      spr.width = size; spr.height = size
      spr.blendMode = 'add' as any
      this.stage.addChild(spr)
      this.stars.push({ spr, id: n.id, size, color: 0xffffff })
    }

    // links as graphics objects
    for (const e of this.edges) {
      const a = nodes.find(n => n.id === e.a); const b = nodes.find(n => n.id === e.b)
      if (!a || !b) continue
      const ta = getVibeToken((a.vibe as any) ?? 'calm')
      const tb = getVibeToken((b.vibe as any) ?? 'calm')

      const graphics = new PIXI.Graphics()
      graphics.blendMode = 'add' as any
      this.stage.addChild(graphics)
      
      this.links.push({ 
        graphics, 
        aId: a.id, 
        bId: b.id, 
        colorA: ta.ring,
        colorB: tb.ring,
        strength: Math.max(0.1, Math.min(1, e.strength))
      })
    }
  }

  onFrame(_dt: number, _project: (lng:number,lat:number)=>{x:number;y:number}) {
    // project 0..1 screen-space → pixels
    const w = (this.map as any).getContainer()?.clientWidth || 1024
    const h = (this.map as any).getContainer()?.clientHeight || 768

    // position stars
    for (const s of this.stars) {
      const n = this.nodes.find(nn => nn.id === s.id); if (!n) continue
      s.spr.position.set(n.pos[0]*w, n.pos[1]*h)
    }

    // redraw links with gradient effect
    for (const L of this.links) {
      const a = this.nodes.find(n => n.id === L.aId)
      const b = this.nodes.find(n => n.id === L.bId)
      if (!a || !b) continue
      
      const ax = a.pos[0]*w, ay = a.pos[1]*h
      const bx = b.pos[0]*w, by = b.pos[1]*h
      
      L.graphics.clear()
      
      // Create gradient effect by drawing multiple lines with different colors
      const steps = 5
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1)
        const alpha = (0.25 + 0.65 * L.strength) * (1 - i * 0.15)
        const width = (1 + 2 * L.strength) * (1 - i * 0.2)
        
        // Simple color interpolation
        const color = this.interpolateColors(L.colorA, L.colorB, t)
        
        L.graphics.lineStyle(width, parseInt(color.replace('#', ''), 16), alpha)
        L.graphics.moveTo(ax, ay)
        L.graphics.lineTo(bx, by)
      }
    }
  }
  
  private interpolateColors(colorA: string, colorB: string, t: number): string {
    // Simple hex color interpolation
    const hex1 = colorA.replace('#', '')
    const hex2 = colorB.replace('#', '')
    
    const r1 = parseInt(hex1.slice(0, 2), 16)
    const g1 = parseInt(hex1.slice(2, 4), 16)
    const b1 = parseInt(hex1.slice(4, 6), 16)
    
    const r2 = parseInt(hex2.slice(0, 2), 16)
    const g2 = parseInt(hex2.slice(2, 4), 16)
    const b2 = parseInt(hex2.slice(4, 6), 16)
    
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
}