import { useEffect, useRef, useMemo, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useFieldTiles } from '@/hooks/useFieldTiles';
import { useQueryClient } from '@tanstack/react-query';
import { geohashToCenter, crowdCountToRadius, hslToString } from '@/lib/geo';
import { buildTileTree, hitTest } from '@/lib/quadtree';
import { useMapViewport } from '@/hooks/useMapViewport';
import type { ScreenTile } from '@/types/field';

// Convert HSL color to hex for PIXI
const hslToHex = (hsl: { h: number; s: number; l: number }): number => {
  const h = hsl.h / 360;
  const s = hsl.s;
  const l = hsl.l;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);
  
  return (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255);
};

export default function FieldCanvas() {
  const { data: tiles = [] } = useFieldTiles();
  const qc = useQueryClient();
  const [shouldUsePIXI, setShouldUsePIXI] = useState(false);
  
  // Get realtime-updated cache data for faster rendering
  const cachedTiles = qc.getQueryData(['fieldTilesCache']) as any[] || tiles;
  const activeTiles = cachedTiles.length > 0 ? cachedTiles : tiles;
  
  const { viewport } = useMapViewport();     // mapbox viewport util
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application>();

  // Create a simple projection function since we don't have mapbox integration yet
  const project = useMemo(() => {
    return ([lng, lat]: [number, number]) => {
      const x = ((lng - viewport.center[1]) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      const y = ((viewport.center[0] - lat) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      return { x, y };
    };
  }, [viewport]);

  const tree = useMemo(() => {
    const screenTiles: ScreenTile[] = (activeTiles as any[]).map(t => {
      const [lat, lng] = geohashToCenter(t.tile_id);
      const { x, y } = project([lng, lat]);
      return {
        ...t,
        x,
        y,
        radius: crowdCountToRadius(t.crowd_count),
        color: hslToString(t.avg_vibe),
        hsl: t.avg_vibe,
      };
    });
    return buildTileTree(screenTiles);
  }, [activeTiles, project]);

  /** Check PIXI support once */
  useEffect(() => {
    const checkPIXI = async () => {
      try {
        const isSupported = PIXI.isWebGLSupported();
        setShouldUsePIXI(isSupported);
      } catch (e) {
        setShouldUsePIXI(false);
      }
    };
    checkPIXI();
  }, []);

  /** boot PIXI once */
  useEffect(() => {
    if (!canvasRef.current || !shouldUsePIXI) return;
    appRef.current = new PIXI.Application({
      view: canvasRef.current,
      resizeTo: window,
      antialias: true,
      autoStart: true,
      backgroundAlpha: 0,
    });
    return () => appRef.current?.destroy(true);
  }, [shouldUsePIXI]);

  /** FPS guard -> downgrade blur if low */
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;
    let low = 0;
    app.ticker.add(() => {
      if (app.ticker.FPS < 24) low++; else low = 0;
      if (low > 180) {               // 3 s
        app.stage.filters = [];      // drop blur
      }
    });
  }, []);

  /** render tiles */
  useEffect(() => {
    const app = appRef.current;
    if (!app || !shouldUsePIXI) return;
    
    // Destroy existing sprites and clear stage
    app.stage.children.forEach(child => {
      if (child instanceof PIXI.Sprite) {
        child.destroy();
      }
    });
    app.stage.removeChildren();

    (activeTiles as any[]).forEach(t => {
      const [lat, lng] = geohashToCenter(t.tile_id);
      const { x, y } = project([lng, lat]);
      const spr = new PIXI.Sprite(PIXI.Texture.WHITE);
      spr.tint = hslToHex(t.avg_vibe);
      spr.alpha = 0.55;
      spr.width = spr.height = crowdCountToRadius(t.crowd_count);
      spr.anchor.set(0.5);
      spr.position.set(x, y);
      (spr as any).__tile = t;             // attach for hit-test
      app.stage.addChild(spr);
    });
  }, [activeTiles, project, shouldUsePIXI]);

  /** pointer hit */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const onUp = (e: PointerEvent) => {
      const rect = cvs.getBoundingClientRect();
      const devicePixelRatio = window.devicePixelRatio || 1;
      const x = (e.clientX - rect.left) * devicePixelRatio;
      const y = (e.clientY - rect.top) * devicePixelRatio;
      const tile = hitTest(tree, x, y);
      if (tile) {
        console.log('Tile hit:', tile);       // TODO implement openTileModal
      }
    };
    cvs.addEventListener('pointerup', onUp);
    return () => cvs.removeEventListener('pointerup', onUp);
  }, [tree]);

  // Fallback to SVG if PIXI not supported
  if (!shouldUsePIXI) {
    return (
      <svg className="absolute inset-0 pointer-events-auto">
        {(activeTiles as any[]).map(t => {
          const [lat, lng] = geohashToCenter(t.tile_id);
          const { x, y } = project([lng, lat]);
          const radius = crowdCountToRadius(t.crowd_count);
          return (
            <circle
              key={t.tile_id}
              cx={x}
              cy={y}
              r={radius}
              fill={hslToString(t.avg_vibe)}
              opacity={0.55}
            />
          );
        })}
      </svg>
    );
  }

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-auto" />;
}