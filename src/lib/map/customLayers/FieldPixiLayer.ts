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

  const ensureRendererSize = () => {
    if (!renderer || !map) return;
    const canvas = map.getCanvas();
    const w = canvas.width;
    const h = canvas.height;
    if (renderer.width !== w || renderer.height !== h) {
      renderer.resize(w, h);
    }
  };

  const project = (lng: number, lat: number) => {
    const p = map!.project([lng, lat] as [number, number]);
    return { x: p.x, y: p.y };
  };

  const materializePoint = (pt: FieldPoint) => {
    let g = pool.get(pt.id);
    if (!g) {
      g = new PIXI.Graphics();
      stage!.addChild(g);
      pool.set(pt.id, g);
    }

    const { x, y } = project(pt.lng, pt.lat);

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
      // soft glow
      g.beginFill(drawColor, alpha * 0.20);
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

      // Friend ring
      if (pt.halo) {
        const ringRadius = (pt.haloScale ?? 2.4) * baseRadius;
        const ringAlpha = clamp(style.haloAlpha * style.dimFactor, 0.05, 1);
        g.lineStyle({
          width: Math.max(1.5, baseRadius * 0.25),
          color: (typeof pt.haloColor === 'number' ? pt.haloColor : drawColor),
          alpha: ringAlpha,
          alignment: 0.5,
        });
        g.drawCircle(x, y, ringRadius);
        g.lineStyle(0, 0, 0);
      }

      // Core dot
      g.beginFill(drawColor, alpha);
      g.drawCircle(x, y, baseRadius);
      g.endFill();
    }
  };

  const prunePool = () => {
    const ids = new Set(points.map(p => p.id));
    for (const [pid, g] of pool.entries()) {
      if (!ids.has(pid)) {
        g.destroy();
        pool.delete(pid);
      }
    }
  };

  const renderFrame = () => {
    if (!renderer || !stage) return;
    ensureRendererSize();
    for (const pt of points) materializePoint(pt);
    prunePool();
    renderer.render(stage);
  };

  const self: mapboxgl.CustomLayerInterface & FieldPixiLayerAPI = {
    id,
    type: 'custom',
    renderingMode: '2d',

    onAdd(m: mapboxgl.Map, gl: WebGLRenderingContext) {
      map = m;

      renderer = new PIXI.Renderer({
        context: gl,
        antialias: true,
        premultipliedAlpha: true,
        clearBeforeRender: false, // Mapbox clears
        powerPreference: 'high-performance',
      });

      stage = new PIXI.Container();

      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);

      map.triggerRepaint();
    },

    render() {
      renderFrame();
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