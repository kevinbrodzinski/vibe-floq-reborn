// src/lib/map/customLayers/FieldPixiLayer.ts
import type mapboxgl from 'mapbox-gl';
import * as PIXI from 'pixi.js';

type LngLat = { lng: number; lat: number };

export type FieldPoint = LngLat & {
  id: string;
  intensity?: number;   // 0..1 visual weight (alpha + size)
  color?: number;       // 0xRRGGBB; actual color used in rendering
  // friend halo
  halo?: boolean;
  haloColor?: number;
  haloScale?: number;   // ~2.4 by default
  // "you" marker
  isYou?: boolean;      // draws a pin shape instead of dot
};

export type FieldPixiStyle = {
  enableColor: boolean; // false → ignore provided color & render white (or token in bridge)
  dimFactor: number;    // 0..1 global alpha multiplier (night/battery)
  haloAlpha: number;    // 0..1 friend ring alpha
  coreAlpha: number;    // base alpha before intensity/dim
};

export type FieldPixiOptions = {
  id?: string;
  initialPoints?: FieldPoint[];
  style?: Partial<FieldPixiStyle>;
};

type FieldPixiLayerAPI = {
  setPoints: (pts: FieldPoint[]) => void;
  setStyle: (style: Partial<FieldPixiStyle>) => void;
  destroy: () => void;
};

const DEFAULT_STYLE: FieldPixiStyle = {
  enableColor: true,
  dimFactor: 1.0,
  haloAlpha: 0.85,
  coreAlpha: 0.9,
};

export function createFieldPixiLayer(
  opts: FieldPixiOptions = {}
): (mapboxgl.CustomLayerInterface & FieldPixiLayerAPI) {
  const id = opts.id ?? 'field-pixi';
  let map: mapboxgl.Map | null = null;

  // PIXI objects
  let renderer: PIXI.Renderer | null = null;
  let stage: PIXI.Container | null = null;

  // Data & style
  let points: FieldPoint[] = opts.initialPoints ?? [];
  let style: FieldPixiStyle = { ...DEFAULT_STYLE, ...(opts.style ?? {}) };

  // Pool of graphics keyed by point id
  const pool = new Map<string, PIXI.Graphics>();
  
  // Advanced features state
  let animationTime = 0;
  let lastViewport = { bounds: null as any, zoom: 0 };
  const clusters = new Map<string, { points: FieldPoint[], center: { x: number, y: number }, size: number }>();

  const ensureRendererSize = () => {
    // Hard guards – early out if anything isn't ready
    if (!renderer || !map) return;

    const cvs = map.getCanvas();
    // Prefer actual backing-store size if Mapbox already set it
    const w = cvs.width || Math.max(1, Math.floor(cvs.clientWidth * window.devicePixelRatio || 1));
    const h = cvs.height || Math.max(1, Math.floor(cvs.clientHeight * window.devicePixelRatio || 1));

    // Some PIXI builds don't expose `renderer.screen`; rely on view size
    const viewW: number | undefined = (renderer as any).view?.width;
    const viewH: number | undefined = (renderer as any).view?.height;

    // Resize only when needed to avoid perf spikes
    if (viewW !== w || viewH !== h) {
      // `resize` exists on both PIXI v7/v8 renderers
      (renderer as any).resize?.(w, h);
    }
  };

  const project = (lng: number, lat: number) => {
    const p = map!.project([lng, lat] as [number, number]);
    return { x: p.x, y: p.y };
  };

  // Spatial culling: only render points in viewport + margin
  const isInViewport = (x: number, y: number, margin = 100) => {
    if (!renderer || !map) return true;
    // Use map canvas dimensions instead of renderer internals
    const cvs = map.getCanvas();
    const w = cvs.width || cvs.clientWidth || 1000;
    const h = cvs.height || cvs.clientHeight || 1000;
    return x >= -margin && x <= w + margin && 
           y >= -margin && y <= h + margin;
  };

  // Simple clustering: group nearby points at low zoom levels
  const buildClusters = () => {
    clusters.clear();
    const zoom = map?.getZoom() || 15;
    
    if (zoom > 12) return; // No clustering at high zoom
    
    const clusterDistance = Math.max(50, 200 - zoom * 10);
    const processed = new Set<string>();
    
    for (const point of points) {
      if (processed.has(point.id)) continue;
      
      const screenPos = project(point.lng, point.lat);
      const cluster = {
        points: [point],
        center: screenPos,
        size: 1
      };
      
      // Find nearby points
      for (const other of points) {
        if (processed.has(other.id) || other.id === point.id) continue;
        
        const otherPos = project(other.lng, other.lat);
        const distance = Math.sqrt(
          Math.pow(screenPos.x - otherPos.x, 2) + 
          Math.pow(screenPos.y - otherPos.y, 2)
        );
        
        if (distance < clusterDistance) {
          cluster.points.push(other);
          cluster.size++;
          processed.add(other.id);
        }
      }
      
      processed.add(point.id);
      clusters.set(point.id, cluster);
    }
  };

  const materializePoint = (pt: FieldPoint) => {
    let g = pool.get(pt.id);
    if (!g) {
      g = new PIXI.Graphics();
      stage!.addChild(g);
      pool.set(pt.id, g);
    }

    const { x, y } = project(pt.lng, pt.lat);
    
    // Debug: Log rendering attempts
    if (pt.isYou) {
      console.log('[FieldPixiLayer] Rendering YOU pin:', {
        id: pt.id,
        lat: pt.lat,
        lng: pt.lng,
        screenX: x,
        screenY: y,
        isYou: pt.isYou
      });
    }
    
    // Spatial culling optimization
    if (!isInViewport(x, y)) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Alpha & size from intensity + global style dim
    const baseAlpha = clamp(style.coreAlpha, 0.05, 1);
    const intensity = clamp(pt.intensity ?? 0.85, 0.05, 1);
    const alpha = clamp(baseAlpha * intensity * style.dimFactor, 0.05, 1);
    const baseRadius = 6 + Math.round(10 * intensity);

    // Color gate (bridge will decide actual color; layer honors enableColor only)
    const drawColor = style.enableColor
      ? (typeof pt.color === 'number' ? pt.color : 0xffffff)
      : 0xffffff;

    // Render
    g.clear();

    if (pt.isYou) {
      // --- "YOU" PIN ---
      // Teardrop: head circle + pointer body
      const r = baseRadius * 1.2;
      console.log('[FieldPixiLayer] Drawing YOU pin with:', {
        x, y, r, alpha, drawColor: drawColor.toString(16), baseRadius
      });
      
      // soft glow - make more visible for debugging
      g.beginFill(drawColor, Math.max(alpha * 0.20, 0.3));
      g.drawCircle(x, y - r * 0.55, r * 1.8);
      g.endFill();

      // head
      g.beginFill(drawColor, alpha);
      g.drawCircle(x, y - r * 0.55, r);
      g.endFill();

      // pointer body (triangle-ish)
      g.beginFill(drawColor, alpha);
      g.moveTo(x, y + r * 0.15);
      g.lineTo(x - r * 0.75, y - r * 0.25);
      g.lineTo(x + r * 0.75, y - r * 0.25);
      g.lineTo(x, y + r * 0.15);
      g.endFill();

      // subtle inner dot
      g.beginFill(0xffffff, Math.min(1, alpha + 0.1));
      g.drawCircle(x, y - r * 0.55, r * 0.35);
      g.endFill();

    } else {
      // --- Ambient halo ---
      g.beginFill(drawColor, alpha * 0.22);
      g.drawCircle(x, y, baseRadius * 2.0);
      g.endFill();

      // Animated friend ring
      if (pt.halo) {
        const ringRadius = (pt.haloScale ?? 2.4) * baseRadius;
        const baseRingAlpha = clamp(style.haloAlpha * style.dimFactor, 0.05, 1);
        
        // Animated pulsing effect
        const pulseSpeed = 0.002;
        const pulseIntensity = 0.3;
        const animatedAlpha = baseRingAlpha + Math.sin(animationTime * pulseSpeed) * pulseIntensity * baseRingAlpha;
        const animatedRadius = ringRadius + Math.sin(animationTime * pulseSpeed * 1.2) * 2;
        
        g.stroke({ width: Math.max(1.5, baseRadius * 0.25), color: (typeof pt.haloColor === 'number' ? pt.haloColor : drawColor), alpha: clamp(animatedAlpha, 0.1, 1), alignment: 0.5 });
        g.drawCircle(x, y, animatedRadius);
      }

      // Core dot
      g.beginFill(drawColor, alpha);
      g.drawCircle(x, y, baseRadius);
      g.endFill();
    }
  };

  const prunePool = () => {
    const activeIds = new Set([
      ...points.map(p => p.id),
      ...Array.from(clusters.keys()).map(k => `cluster-${k}`)
    ]);
    
    for (const [pid, g] of pool.entries()) {
      if (!activeIds.has(pid)) {
        g.destroy();
        pool.delete(pid);
      }
    }
  };

  const materializeCluster = (clusterId: string, cluster: any) => {
    let g = pool.get(`cluster-${clusterId}`);
    if (!g) {
      g = new PIXI.Graphics();
      stage!.addChild(g);
      pool.set(`cluster-${clusterId}`, g);
    }

    const { x, y } = cluster.center;
    if (!isInViewport(x, y)) {
      g.visible = false;
      return;
    }
    g.visible = true;

    const size = cluster.size;
    const radius = Math.min(30, 12 + size * 2);
    const alpha = clamp(style.coreAlpha * style.dimFactor, 0.3, 0.9);

    g.clear();
    
    // Cluster background
    g.beginFill(0x1a1a1a, alpha);
    g.drawCircle(x, y, radius);
    g.endFill();
    
    // Cluster border with animation
    const borderPulse = 1 + Math.sin(animationTime * 0.003) * 0.1;
    g.stroke({ width: 2 * borderPulse, color: 0xffffff, alpha: alpha * 0.8 });
    g.drawCircle(x, y, radius);

    // Count text (simplified - in real app you'd use PIXI.Text)
    g.beginFill(0xffffff, alpha + 0.2);
    const textRadius = Math.min(radius * 0.3, 6);
    g.drawCircle(x, y, textRadius);
    g.endFill();
  };

  const renderFrame = () => {
    if (!renderer || !stage || !map) return;   // <— add !map guard too
    ensureRendererSize();
    
    // Debug: Log render attempts
    if (points.length > 0) {
      console.log('[FieldPixiLayer] Rendering frame with', points.length, 'points');
    }
    
    // Update animation time
    animationTime += 16; // ~60fps
    
    // Check if viewport changed significantly for clustering
    const currentBounds = map?.getBounds();
    const currentZoom = map?.getZoom() || 15;
    const boundsEq = (a: mapboxgl.LngLatBounds, b: mapboxgl.LngLatBounds) =>
      JSON.stringify(a.toArray()) === JSON.stringify(b.toArray())
    const viewportChanged = !lastViewport.bounds || 
      Math.abs(currentZoom - lastViewport.zoom) > 0.5 ||
      !currentBounds || !boundsEq(currentBounds, lastViewport.bounds);
    
    if (viewportChanged) {
      buildClusters();
      lastViewport = { bounds: currentBounds, zoom: currentZoom };
    }
    
    // Render clusters at low zoom, individual points at high zoom
    if (currentZoom <= 12 && clusters.size > 0) {
      // Render clusters
      for (const [clusterId, cluster] of clusters) {
        materializeCluster(clusterId, cluster);
      }
      // Hide individual points
      for (const pt of points) {
        const g = pool.get(pt.id);
        if (g) g.visible = false;
      }
    } else {
      // Render individual points
      for (const pt of points) materializePoint(pt);
      // Hide clusters
      for (const clusterId of clusters.keys()) {
        const g = pool.get(`cluster-${clusterId}`);
        if (g) g.visible = false;
      }
    }
    
    prunePool();
    renderer.render(stage);
  };

  const self: mapboxgl.CustomLayerInterface & FieldPixiLayerAPI = {
    id,
    type: 'custom',
    renderingMode: '2d',

    onAdd(m: mapboxgl.Map, gl: WebGLRenderingContext) {
      map = m;

      // PIXI v8 compatibility: Use WebGLRenderer directly for Mapbox integration
      try {
        renderer = new PIXI.WebGLRenderer() as PIXI.Renderer;
      } catch (error) {
        console.error('Failed to create WebGLRenderer, trying fallback:', error);
        // Fallback to autoDetectRenderer for non-WebGL contexts
        renderer = PIXI.autoDetectRenderer({}) as unknown as PIXI.Renderer;
      }

      // Some builds expose renderer.view – make it non-interactive just in case
      if ((renderer as any).view) {
        (renderer as any).view.style.pointerEvents = 'none';
      }

      stage = new PIXI.Container();

      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);

      map.triggerRepaint();
    },

    render() {
      try {
        renderFrame();
        // Continuous animation only when halos are visible
        const hasAnimatedElements = points.some(p => p.halo) || clusters.size > 0;
        if (hasAnimatedElements) {
          map?.triggerRepaint();
        }
      } catch (err) {
        // Swallow first-frame races gracefully; Mapbox will call us again next tick
        // eslint-disable-next-line no-console
        if (import.meta?.env?.DEV) console.warn('[FieldPixiLayer] render skipped:', err);
      }
    },

    onRemove() {
      try {
        for (const [, g] of pool) g.destroy();
        pool.clear();
        stage?.destroy({ children: true });
        renderer?.destroy(false);
      } finally {
        stage = null;
        renderer = null;
        map = null;
      }
    },

    setPoints(pts: FieldPoint[]) {
      console.log('[FieldPixiLayer] Received points:', pts.length);
      if (pts.length > 0) {
        console.log('[FieldPixiLayer] Sample point:', pts[0]);
      }
      points = pts;
      map?.triggerRepaint();
    },

    setStyle(next: Partial<FieldPixiStyle>) {
      style = { ...style, ...next };
      map?.triggerRepaint();
    },

    destroy() {
      if (map && (map as any).style) {
        if (map.getLayer(this.id)) map.removeLayer(this.id);
      }
      // Mapbox will call onRemove
    },
  };

  return self;
}

/* utils */
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}