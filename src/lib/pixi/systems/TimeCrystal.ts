import * as PIXI from 'pixi.js';
import mapboxgl from 'mapbox-gl';

type Horizon = 'now' | 'p30' | 'p60' | 'p120'

interface PressureCell {
  id?: string
  center: [number, number]
  pressure?: number
  color?: string
  opacity?: number
  radius?: number
}

interface CellRec {
  cell: PressureCell
  mesh: PIXI.Graphics
  lastZoom: number
}

export class TimeCrystal {
  private stage?: PIXI.Container
  private map?: mapboxgl.Map
  private ready = false
  private pending: any[] = []
  private time = 0
  private segs: number
  private maxCells: number
  private active: Horizon | null = null
  private data: { [k in Horizon]: CellRec[] } = {
    now: [],
    p30: [],
    p60: [],
    p120: []
  }
  
  // Metrics for observability
  private queueDepth = 0
  private drawCount = 0

  constructor() {
    this.segs = 8
    this.maxCells = 40
  }

  onAdd(stage: PIXI.Container, map: mapboxgl.Map) { 
    this.stage = stage
    this.map = map 
    this.ready = true
    
    // Emit observability metric
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[TimeCrystal] pixi_timecrystal_ready=1');
    }
    
    // Process any queued events
    if (this.pending.length) {
      this.queueDepth = this.pending.length;
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[TimeCrystal] pixi_timecrystal_queue_depth=${this.queueDepth}`);
      }
      
      for (const event of this.pending) {
        this.processMessage(event.type, event.payload)
      }
      this.pending = []
      this.queueDepth = 0;
    }
  }
  
  onRemove() {
    this.destroy();
  }
  
  destroy() {
    if (!this.stage) return;
    
    // Clean up all mesh resources
    for (const h in this.data) {
      for (const r of this.data[h as Horizon]) {
        if (r.mesh) r.mesh.destroy({ children: true });
      }
    }
    
    // Clean up stage children
    if (this.stage.children) {
      this.stage.children.forEach((c) => c.destroy?.({ children: true } as any));
    }
    this.stage.destroy({ children: true });
    
    // Reset state
    this.stage = undefined;
    this.map = undefined;
    this.ready = false;
    this.pending.length = 0;
  }

  onMessage(type: string, payload: any) {
    if (!this.ready) {
      // Queue events until system is ready
      this.pending.push({ type, payload })
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[TimeCrystal] onMessage before onAdd; queuing event:', type)
      }
      return
    }
    
    this.processMessage(type, payload)
  }

  private processMessage(type: string, payload: any) {
    if (type !== 'temporal') return
    if (payload?.now || payload?.p30 || payload?.p120) {
      if (payload.now)  this.data.now  = this.build(payload.now as PressureCell[], 'now', payload.confidence)
      if (payload.p30)  this.data.p30  = this.build(payload.p30 as PressureCell[], 'p30', payload.confidence)
      if (payload.p120) this.data.p120 = this.build(payload.p120 as PressureCell[], 'p120', payload.confidence)
    }

    if (payload?.activated) {
      this.active = payload.activated
    }
  }

  onFrame(dt: number, project: (lng:number,lat:number)=>{x:number;y:number}, zoom: number) {
    if (!this.ready || !this.stage) return
    
    this.time += dt

    const activeList = this.active ? this.data[this.active] : []
    for (const rec of activeList) {
      const { x, y } = project(rec.cell.center[0], rec.cell.center[1])
      rec.mesh.position.set(x, y)

      // Only redraw if zoom changed significantly
      if (Math.abs(zoom - rec.lastZoom) > 0.1) {
        this.drawEnhancedCrystal(rec, zoom)
        rec.lastZoom = zoom
      }
    }
  }

  // ---------- build ----------

  private build(cells: PressureCell[], h: Horizon, confidence?: number): CellRec[] {
    // Safety check: ensure stage exists
    if (!this.stage) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[TimeCrystal] build() called before onAdd; stage not available')
      }
      return []
    }
    
    // Track draw performance
    const drawStart = performance.now();

    // clear old horizon - reuse existing meshes to avoid per-frame allocations
    for (const r of this.data[h]) {
      if (r.mesh && r.mesh instanceof PIXI.Graphics) {
        (r.mesh as PIXI.Graphics).clear();
      } else if (r.mesh) {
        r.mesh.destroy();
        r.mesh = new PIXI.Graphics();
      }
    }

    this.data[h] = []
    const list = cells.slice(0, this.maxCells)
    
    for (let i = 0; i < list.length; i++) {
      const cell = list[i];
      
      // Reuse existing mesh or create new one
      let mesh = this.data[h][i]?.mesh;
      if (!mesh) {
        mesh = new PIXI.Graphics();
        this.stage!.addChild(mesh);
      }
      
      const rec: CellRec = { 
        cell, 
        mesh, 
        lastZoom: -1 
      };
      
      // Draw the crystal content
      this.drawEnhancedCrystal(rec, h as Horizon, confidence);

      this.data[h].push(rec)
    }

    // Emit draw performance metric
    const drawTime = performance.now() - drawStart;
    this.drawCount++;
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[TimeCrystal] pixi_timecrystal_draw_ms=${drawTime.toFixed(2)} (draw #${this.drawCount})`);
    }
    
    return this.data[h]
  }

  private drawEnhancedCrystal(rec: CellRec, h: Horizon | string | number, confidence = 1.0): void {
    const g = rec.mesh as PIXI.Graphics;
    const cell = rec.cell;
    g.clear(); // Reuse existing graphics object
    
    // physical location + size
    const radius = 6 + (cell.pressure ?? 0.5) * 22 // px baseline
    const { coreCol, edgeCol, specCol } = this.paletteFor(h as Horizon)
    const baseOpacity = h === 'now' ? 1.0 : h === 'p30' ? 0.78 : 0.5
    const opacity = baseOpacity * (0.5 + 0.5 * confidence) // scale by confidence
    const facets  = h === 'now' ? 14 : h === 'p30' ? 10 : 7
    const shimmer = h === 'p30' ? 1.0 : (h === 'p120' ? 0.6 : 0.0)

    // Enhanced confidence gating
    if (confidence < 0.3) return // skip very low confidence crystals
    
    // Confidence-based visual enhancement
    const confRadius = radius * (0.7 + 0.3 * confidence)
    const confOpacity = opacity * confidence
    
    // base geometry
    g.lineStyle(1.5, edgeCol, confOpacity * 0.7)
    g.beginFill(coreCol, confOpacity * 0.4)
    
    // Draw enhanced crystal shape based on confidence
    if (confidence > 0.8) {
      // High confidence: complex multi-layer crystal
      this.drawComplexCrystal(g, confRadius, facets, shimmer)
    } else if (confidence > 0.5) {
      // Medium confidence: standard faceted crystal
      this.drawFacetedCrystal(g, confRadius, facets)
    } else {
      // Low confidence: simple circle
      g.drawCircle(0, 0, confRadius * 0.8)
    }
    
    g.endFill()

    // enhanced specular highlights for high confidence
    if (confidence > 0.6 && shimmer > 0) {
      g.lineStyle(0.8, specCol, (confOpacity * shimmer) * 0.9)
      g.moveTo(-confRadius * 0.3, -confRadius * 0.7)
      g.lineTo(confRadius * 0.2, -confRadius * 0.4)
    }
  }

  private drawComplexCrystal(g: PIXI.Graphics, radius: number, facets: number, shimmer: number) {
    // Multi-layer crystal for high confidence
    const outerRadius = radius;
    const midRadius = radius * 0.7;
    const innerRadius = radius * 0.4;
    
    // Outer layer
    this.drawPolygon(g, 0, 0, outerRadius, facets);
    
    // Middle layer with offset
    const midFacets = Math.max(6, facets - 2);
    this.drawPolygon(g, 0, 0, midRadius, midFacets, Math.PI / midFacets);
    
    // Inner core
    g.drawCircle(0, 0, innerRadius);
  }

  private drawFacetedCrystal(g: PIXI.Graphics, radius: number, facets: number) {
    this.drawPolygon(g, 0, 0, radius, facets);
  }

  private drawPolygon(g: PIXI.Graphics, cx: number, cy: number, radius: number, sides: number, rotation = 0) {
    const angleStep = (2 * Math.PI) / sides;
    let firstPoint = true;
    
    for (let i = 0; i <= sides; i++) {
      const angle = i * angleStep + rotation;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      
      if (firstPoint) {
        g.moveTo(x, y);
        firstPoint = false;
      } else {
        g.lineTo(x, y);
      }
    }
  }

  private paletteFor(h: Horizon) {
    switch (h) {
      case 'now':  return { coreCol: 0x10b981, edgeCol: 0x34d399, specCol: 0xffffff }
      case 'p30':  return { coreCol: 0x3b82f6, edgeCol: 0x60a5fa, specCol: 0xe0f2fe }
      case 'p60':  return { coreCol: 0x8b5cf6, edgeCol: 0xa78bfa, specCol: 0xf3e8ff }
      case 'p120': return { coreCol: 0xf59e0b, edgeCol: 0xfbbf24, specCol: 0xfef3c7 }
      default:     return { coreCol: 0x6b7280, edgeCol: 0x9ca3af, specCol: 0xf9fafb }
    }
  }

  private rgbToHex(r: number, g: number, b: number): number {
    r = Math.max(0, Math.min(255, Math.round(r)))
    g = Math.max(0, Math.min(255, Math.round(g)))
    b = Math.max(0, Math.min(255, Math.round(b)))
    return (r << 16) | (g << 8) | b
  }
}