import { useEffect, useRef, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { useFieldTiles } from '@/hooks/useFieldTiles';
import { geohashToCenter, crowdCountToRadius, hslToString } from '@/lib/geo';
import { buildTileTree, hitTest } from '@/lib/quadtree';
import { useMapViewport } from '@/hooks/useMapViewport';
import type { ScreenTile } from '@/types/field';

export default function FieldCanvas() {
  const { data: tiles = [] } = useFieldTiles();
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
    const screenTiles: ScreenTile[] = (tiles as any[]).map(t => {
      const [lat, lng] = geohashToCenter(t.tile_id);
      const { x, y } = project([lng, lat]);
      return {
        ...t,
        x,
        y,
        radius: crowdCountToRadius(t.crowd_count),
        color: hslToString(t.avg_vibe),
      };
    });
    return buildTileTree(screenTiles);
  }, [tiles, project]);

  /** boot PIXI once */
  useEffect(() => {
    if (!canvasRef.current) return;
    appRef.current = new PIXI.Application({
      view: canvasRef.current,
      resizeTo: window,
      antialias: true,
      autoStart: true,
      backgroundAlpha: 0,
    });
    return () => appRef.current?.destroy(true);
  }, []);

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
    if (!app) return;
    app.stage.removeChildren();

    (tiles as any[]).forEach(t => {
      const [lat, lng] = geohashToCenter(t.tile_id);
      const { x, y } = project([lng, lat]);
      const spr = new PIXI.Sprite(PIXI.Texture.WHITE);
      spr.tint = parseInt(hslToString(t.avg_vibe).replace('#', '0x')) || 0xffffff;
      spr.alpha = 0.55;
      spr.width = spr.height = crowdCountToRadius(t.crowd_count);
      spr.anchor.set(0.5);
      spr.position.set(x, y);
      (spr as any).__tile = t;             // attach for hit-test
      app.stage.addChild(spr);
    });
  }, [tiles, project]);

  /** pointer hit */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const onUp = (e: PointerEvent) => {
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const tile = hitTest(tree, x, y);
      if (tile) {
        console.log('Tile hit:', tile);       // TODO implement openTileModal
      }
    };
    cvs.addEventListener('pointerup', onUp);
    return () => cvs.removeEventListener('pointerup', onUp);
  }, [tree]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-auto" />;
}