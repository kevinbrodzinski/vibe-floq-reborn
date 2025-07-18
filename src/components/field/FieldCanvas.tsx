import { useEffect, useRef, useMemo, useState } from 'react';
import * as PIXI from 'pixi.js';
// Removed simplex-noise import - using simple random drift instead
import { useFieldTiles } from '@/hooks/useFieldTiles';
import { useQueryClient } from '@tanstack/react-query';
import { geohashToCenter, crowdCountToRadius, hslToString, tilesForViewport } from '@/lib/geo';
import { buildTileTree, hitTest } from '@/lib/quadtree';
import { useMapViewport } from '@/hooks/useMapViewport';
import { useFriends } from '@/hooks/useFriends';
import { useFriendTrails } from '@/hooks/useFriendTrails';
import { useRippleQueue } from '@/hooks/useRippleQueue';
import { useUserSettings } from '@/hooks/useUserSettings';
import { RippleEffect } from '@/shaders/RippleFilter';
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
  
  const { viewport } = useMapViewport();
  const { settings } = useUserSettings();
  const { friends = [] } = useFriends();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application>();
  
  // Phase 3 refs and state
  const rippleContainer = useRef<PIXI.Container>();
  const trailGraphics = useRef<PIXI.Graphics>();
  const ripples = useRef<RippleEffect[]>([]);
  // Simple random drift instead of complex noise
  
  // Create a simple projection function since we don't have mapbox integration yet
  const project = useMemo(() => {
    return ([lng, lat]: [number, number]) => {
      const x = ((lng - viewport.center[1]) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      const y = ((viewport.center[0] - lat) * 100000 / Math.pow(2, 10 - viewport.zoom)) + 400;
      return { x, y };
    };
  }, [viewport]);

  // Friend trails
  const friendIds = useMemo(() => friends.map((f: any) => f.friend_id), [friends]);
  const friendTrails = useFriendTrails(friendIds);
  
  // Tile IDs for ripple detection
  const [west, south, east, north] = viewport.bounds;
  const nw: [number, number] = [north, west];
  const se: [number, number] = [south, east];
  const tileIds = useMemo(() => tilesForViewport(nw, se, viewport.zoom), [nw, se, viewport.zoom]);
  
  // Ripple queue handler
  const addRipple = useMemo(() => (tileId: string, delta: number) => {
    const tile = activeTiles.find((t: any) => t.tile_id === tileId);
    if (!tile || !rippleContainer.current) return;
    
    const [lat, lng] = geohashToCenter(tile.tile_id);
    const { x, y } = project([lng, lat]);
    const radius = crowdCountToRadius(tile.crowd_count);
    
    const ripple = new RippleEffect(x, y, radius, 0xffffff);
    rippleContainer.current.addChild(ripple.sprite);
    ripples.current.push(ripple);
  }, [activeTiles, project]);
  
  useRippleQueue(tileIds, addRipple);

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
    
    // Setup Phase 3 containers
    rippleContainer.current = new PIXI.Container();
    trailGraphics.current = new PIXI.Graphics();
    appRef.current.stage.addChild(rippleContainer.current);
    appRef.current.stage.addChild(trailGraphics.current);
    
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

  /** animate ripples & drift */
  useEffect(() => {
    const app = appRef.current;
    if (!app || !shouldUsePIXI) return;
    
    const ticker = () => {
      const t = performance.now() * 0.0004;
      
      // drift dots with noise
      app.stage.children.forEach(child => {
        if (child === rippleContainer.current || child === trailGraphics.current) return;
        if (child instanceof PIXI.Sprite) {
          const ox = (Math.random() - 0.5) * 0.3;
          const oy = (Math.random() - 0.5) * 0.3;
          child.x += ox;
          child.y += oy;
        }
      });
      
      // update ripples
      if ((settings as any)?.field_ripples !== false) {
        ripples.current = ripples.current.filter(ripple => {
          const shouldContinue = ripple.update();
          if (!shouldContinue) {
            rippleContainer.current?.removeChild(ripple.sprite);
            ripple.destroy();
          }
          return shouldContinue;
        });
      }
    };
    
    app.ticker.add(ticker);
    return () => {
      app.ticker.remove(ticker);
    };
  }, [shouldUsePIXI, (settings as any)?.field_ripples]);

  /** render tiles */
  useEffect(() => {
    const app = appRef.current;
    if (!app || !shouldUsePIXI) return;
    
    // Clear existing tile sprites only (preserve containers)
    app.stage.children.forEach(child => {
      if (child instanceof PIXI.Sprite) {
        child.destroy();
        app.stage.removeChild(child);
      }
    });

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
    
    // Draw friend trails
    if ((settings as any)?.field_trails !== false && trailGraphics.current) {
      trailGraphics.current.clear();
      trailGraphics.current.lineStyle(2, 0xffffff, 0.7);
      
      Array.from(friendTrails.entries()).forEach(([userId, trail]) => {
        if (trail.length > 1) {
          const startPoint = project([trail[0].lng, trail[0].lat]);
          trailGraphics.current!.moveTo(startPoint.x, startPoint.y);
          
          trail.forEach(point => {
            const { x, y } = project([point.lng, point.lat]);
            trailGraphics.current!.lineTo(x, y);
          });
        }
      });
    }
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