
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { useSpatialIndex } from '@/hooks/useSpatialIndex';
import { GraphicsPool } from '@/utils/graphicsPool';
import { TileSpritePool } from '@/utils/tileSpritePool';
import { geohashToCenter, projectLatLng, crowdCountToRadius, getMapInstance } from '@/lib/geo';
import { vibeToColor } from '@/utils/vibeToHSL';
import type { Vibe } from '@/types/vibes';
import { safeVibe } from '@/types/enums/vibes';
import type { Person } from '@/components/field/contexts/FieldSocialContext';
import type { FieldTile } from '@/types/field';
import { forwardRef } from 'react';
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics';

interface FieldCanvasProps {
  people: Person[];
  tileIds?: string[];
  fieldTiles?: FieldTile[];
  viewportGeo?: {
    minLat: number;
    maxLat: number;  
    minLng: number;
    maxLng: number;
  };
  onRipple?: (x: number, y: number) => void;
}

export const FieldCanvas = forwardRef<HTMLCanvasElement, FieldCanvasProps>(({
  people = [],
  tileIds = [],
  fieldTiles = [],
  viewportGeo,
  onRipple
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actualRef = (ref as React.RefObject<HTMLCanvasElement>) || canvasRef;
  const { light } = useAdvancedHaptics();
  const appRef = useRef<Application | null>(null);
  const peopleContainerRef = useRef<Container | null>(null);
  const heatContainerRef = useRef<Container | null>(null);
  const tilePoolRef = useRef<TileSpritePool | null>(null);
  const graphicsPoolRef = useRef<GraphicsPool | null>(null);
  
  // Projection cache for performance (cache [tile_id, zoom] => ScreenXY)
  const projectionCacheRef = useRef<Map<string, {x: number, y: number, zoom: number}>>(new Map());
  
  const spatialPeople = useMemo(() => 
    people.map(person => ({
      id: person.id,
      x: person.x,
      y: person.y,
      width: 24,
      height: 24,
      minX: person.x - 12,
      minY: person.y - 12,
      maxX: person.x + 12,
      maxY: person.y + 12,
      sprite: null as any
    })), [people]
  );

  const { searchViewport } = useSpatialIndex(spatialPeople);

  // Initialize PIXI app
  useEffect(() => {
    if (!actualRef.current) return;

    const app = new Application();
    appRef.current = app;

    app.init({
      canvas: actualRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      antialias: true,
    }).then(() => {
      // Create containers in proper z-order
      const heatContainer = new Container();
      const peopleContainer = new Container();
      
      app.stage.addChild(heatContainer);
      app.stage.addChild(peopleContainer);
      
      heatContainerRef.current = heatContainer;
      peopleContainerRef.current = peopleContainer;
      
      // Initialize pools
      tilePoolRef.current = new TileSpritePool();
      graphicsPoolRef.current = new GraphicsPool();
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  // Handle canvas clicks for ripples
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!onRipple || !actualRef.current) return;
    const rect = actualRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onRipple(x, y);
    light(); // Add haptic feedback for ripples
  }, [onRipple, actualRef, light]);

  // Animation loop
  useEffect(() => {
    const app = appRef.current;
    const heatContainer = heatContainerRef.current;
    const peopleContainer = peopleContainerRef.current;
    const tilePool = tilePoolRef.current;
    const graphicsPool = graphicsPoolRef.current;
    
    if (!app || !heatContainer || !peopleContainer || !tilePool || !graphicsPool) return;

    let animationId: number;
    
    const animate = () => {
      // ---- TILE HEAT ----
      if (viewportGeo && fieldTiles.length > 0) {
        const visibleTiles = fieldTiles.filter(t => t.crowd_count >= 3);
        
        visibleTiles.forEach(tile => {
          const id = tile.tile_id;
          const sprite = tilePool.acquire(id);
          if (!sprite.parent) heatContainer.addChild(sprite);

          // Use cached projection for performance (memoize by tile_id + zoom + bearing)
          const projectionCache = projectionCacheRef.current;
          const map = getMapInstance();
          const currentZoom = map?.getZoom() ?? 11;
          const currentBearing = map?.getBearing() ?? 0;
          const cacheKey = `${id}:${Math.round(currentZoom * 10)}:${Math.round(currentBearing)}`;
          
          let screenPos = projectionCache.get(cacheKey);
          if (!screenPos || screenPos.zoom !== currentZoom) {
            const { lng, lat } = geohashToCenter(id);
            const { x, y } = projectLatLng(lng, lat);
            screenPos = { x, y, zoom: currentZoom };
            projectionCache.set(cacheKey, screenPos);
            
            // Cleanup old cache entries (keep last 500)
            if (projectionCache.size > 500) {
              const oldKeys = Array.from(projectionCache.keys()).slice(0, 100);
              oldKeys.forEach(key => projectionCache.delete(key));
            }
          }
          
          const { x, y } = screenPos;
          const radius = crowdCountToRadius(tile.crowd_count);
          
          sprite.x = x - radius;
          sprite.y = y - radius;
          sprite.width = sprite.height = radius * 2;

          // Color and fade
          const targetAlpha = Math.min(1, Math.log2(tile.crowd_count) / 5);
          
          // Convert HSL to RGB for PIXI
          const { h, s, l } = tile.avg_vibe;
          const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
            const a = s * Math.min(l, 1 - l);
            const f = (n: number) => {
              const k = (n + h * 12) % 12;
              const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
              return Math.round(255 * c);
            };
            return [f(0), f(8), f(4)];
          };
          
          const [r, g, b] = hslToRgb(h, s, l);
          const vibeColor = (r << 16) + (g << 8) + b;
          
          sprite.tint = vibeColor;
          sprite.alpha += (targetAlpha - sprite.alpha) * 0.2;
        });

        // Release sprites no longer visible
        tilePool.active.forEach((sprite, id) => {
          if (!visibleTiles.some(t => t.tile_id === id)) {
            tilePool.release(id);
          }
        });
      }

      // ---- PEOPLE DOTS ----
      const viewport = {
        minX: 0,
        minY: 0, 
        maxX: app.screen.width,
        maxY: app.screen.height
      };
      
      const visiblePeople = searchViewport(viewport);
      
      // Update people sprites
      visiblePeople.forEach(person => {
        if (!person.sprite) {
          person.sprite = graphicsPool.acquire();
          peopleContainer.addChild(person.sprite);
        }
        
        person.sprite.clear();
        person.sprite.circle(person.x, person.y, 12);
        person.sprite.fill({ color: 0x00ff00, alpha: 0.8 });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [fieldTiles, people, viewportGeo, searchViewport]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      heatContainerRef.current?.removeChildren();
      peopleContainerRef.current?.removeChildren();
      tilePoolRef.current?.clearAll();
      graphicsPoolRef.current?.releaseAll();
    };
  }, []);

  return (
    <canvas 
      ref={actualRef}
      onClick={handleCanvasClick}
      style={{ 
        width: '100%', 
        height: '100%',
        display: 'block'
      }}
    />
  );
});
