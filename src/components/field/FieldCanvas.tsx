
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Application, Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import { Text as PIXIText } from 'pixi.js';
import { useSpatialIndex } from '@/hooks/useSpatialIndex';
import { GraphicsPool } from '@/utils/graphicsPool';
import { TileSpritePool } from '@/utils/tileSpritePool';
import { projectLatLng, getMapInstance } from '@/lib/geo/project';
import { geohashToCenter, crowdCountToRadius } from '@/lib/geo';
import { clusterWorker } from '@/lib/clusterWorker';
import { useFieldHitTest } from '@/hooks/useFieldHitTest';
import { useAddRipple } from '@/hooks/useAddRipple';
import { useUserLocation } from '@/hooks/useUserLocation';
import { metersToPixelsAtLat } from '@/utils/geoUtils';
import { zIndex } from '@/constants/z.ts';
import { vibeToColor } from '@/utils/vibeToHSL';
import type { Vibe } from '@/types/vibes';
import { safeVibe } from '@/types/enums/vibes';
import type { Person } from '@/components/field/contexts/FieldSocialContext';
import type { FieldTile } from '@/types/field';
import { forwardRef } from 'react';
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics';
import { AnimatePresence } from 'framer-motion';
import { ClusterTooltip } from '@/components/field/ClusterTooltip';

interface FieldCanvasProps {
  people: Person[];
  floqs?: any[];
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
  floqs = [],
  tileIds = [],
  fieldTiles = [],
  viewportGeo,
  onRipple
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actualRef = (ref as React.RefObject<HTMLCanvasElement>) || canvasRef;
  const { light } = useAdvancedHaptics();
  const hitTest = useFieldHitTest();          // ⬅️ HOOK MUST BE TOP-LEVEL
  const addRipple = useAddRipple();           // enqueue shader ripple
  const { pos: myPos } = useUserLocation();   // live lat/lng
  const appRef = useRef<Application | null>(null);
  const fieldTilesRef = useRef<FieldTile[]>(fieldTiles);
  
  /* tooltip helper */
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; count: number; vibeTag: string;
  } | null>(null);

  // Keep fieldTiles ref in sync
  useEffect(() => {
    fieldTilesRef.current = fieldTiles;
  }, [fieldTiles]);

  // dedicated refs so we create the sprites only once
  const myDotRef = useRef<Sprite | null>(null);
  const accuracyRef = useRef<Graphics | null>(null);
  const peopleContainerRef = useRef<Container | null>(null);
  const heatContainerRef = useRef<Container | null>(null);
  const tilePoolRef = useRef<TileSpritePool | null>(null);
  const graphicsPoolRef = useRef<GraphicsPool | null>(null);
  // Track existing floq sprites to prevent recreation
  const floqSpritesRef = useRef<Map<string, Graphics>>(new Map());
  
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

    /* will be assigned after init so we can remove cleanly */
    let onPointerMove: ((e: any) => void) | undefined;

    app.init({
      canvas: actualRef.current,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: undefined, // Force transparent background
      antialias: true,
      resolution: window.devicePixelRatio || 1, // Better quality on high-DPI displays
      autoDensity: true, // Handle high-DPI displays properly
      backgroundAlpha: 0, // Ensure background is transparent
    }).then(() => {
      // Create containers in proper z-order
      const heatContainer = new Container();
      const peopleContainer = new Container();
      
      // Add containers in proper order (last = top layer)
      // heatContainer will be below peopleContainer
      app.stage.addChild(heatContainer);
      app.stage.addChild(peopleContainer); // This will be on top
      
      // Debug the layering
      console.log('[PIXI_LAYERS] Heat container index:', app.stage.children.indexOf(heatContainer));
      console.log('[PIXI_LAYERS] People container index:', app.stage.children.indexOf(peopleContainer));
      
      heatContainerRef.current = heatContainer;
      peopleContainerRef.current = peopleContainer;
      
      // Debug indicators removed to fix green tint issue
      
      // Initialize pools
      tilePoolRef.current = new TileSpritePool();
      graphicsPoolRef.current = new GraphicsPool();

      /* --- "you-are-here" dot --- */
      if (!myDotRef.current) {
        const dot = Sprite.from(Texture.WHITE);
        dot.anchor.set(0.5);
        dot.tint = 0x3399ff;   // blue
        dot.width = dot.height = 12;
        dot.interactive = false;
        dot.eventMode = 'none';
        peopleContainer.addChild(dot);
        myDotRef.current = dot;
      }

      /* --- accuracy circle (optional) --- */
      if (!accuracyRef.current) {
        const g = new Graphics();
        g.lineStyle(2, 0x3399ff, 0.25);
        peopleContainer.addChild(g);
        accuracyRef.current = g;
      }

      /* ------------------------------------------------- hit-testing + ripple */
      onPointerMove = (e: any) => {
        const { clientX, clientY } = e.data?.originalEvent || { clientX: e.globalX, clientY: e.globalY };
        hitTest(clientX, clientY).then(ids => {
          if (!ids.length) {
            setTooltip(null);
            return;
          }

          // Use ref to avoid stale closure
          const currentTiles = fieldTilesRef.current;
          const tile = currentTiles.find(t => t.tile_id === ids[0]);
          if (!tile) return;

          /* tooltip */
          setTooltip({
            x: clientX,
            y: clientY,
            count: tile.crowd_count,
            vibeTag: 'energetic', // TODO: derive from tile.avg_vibe HSL values
          });

          /* GPU ripple */
          addRipple(clientX, clientY);

          /* haptic for mobile */
          light();    // from useAdvancedHaptics()
        });
      };

      app.stage.eventMode = 'static';
      app.stage.on('pointermove', onPointerMove);
    });

    /* ---------- cleanup ---------- */
    return () => {
      if (onPointerMove) app.stage.off('pointermove', onPointerMove);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [hitTest]);        // ← dependency is safe (stable useCallback)

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
    let pending = false;
    let lastFloqsHash = '';
    let lastPeopleHash = '';
    let lastFieldTilesHash = '';
    
    // HSL to RGB conversion (lifted out of loop for performance)
    const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h * 12) % 12;
        const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * color);
      };
      return [f(0), f(8), f(4)];
    };
    
    const animate = () => {
      // Check if data has actually changed
      const currentFloqsHash = JSON.stringify(floqs.map(f => ({ id: f.id, x: f.x, y: f.y })));
      const currentPeopleHash = JSON.stringify(people.map(p => ({ id: p.id, x: p.x, y: p.y })));
      const currentFieldTilesHash = JSON.stringify(fieldTiles.map(t => ({ id: t.tile_id, count: t.crowd_count })));
      
      const hasChanged = currentFloqsHash !== lastFloqsHash || 
                        currentPeopleHash !== lastPeopleHash || 
                        currentFieldTilesHash !== lastFieldTilesHash;
      
      if (!hasChanged) {
        // No changes, just continue the loop without re-rendering
        animationId = requestAnimationFrame(animate);
        return;
      }
      
      // Update hashes
      lastFloqsHash = currentFloqsHash;
      lastPeopleHash = currentPeopleHash;
      lastFieldTilesHash = currentFieldTilesHash;
      
      // Removed flood-log as per review
      
      // ---- TILE CLUSTERING ----
      if (viewportGeo && fieldTiles.length > 0) {
        const visibleTiles = fieldTiles.filter(t => t.crowd_count >= 3);
        
        // Build raw tiles for worker
        const rawTiles = visibleTiles.map(tile => {
          const [lat, lng] = geohashToCenter(tile.tile_id);
          const { x, y } = projectLatLng(lng, lat);
          return {
            id: tile.tile_id,                    // new - needed for hit-test
            x,
            y,
            r: crowdCountToRadius(tile.crowd_count),
            vibe: tile.avg_vibe,
          };
        });

        // Get clusters from worker (throttled to avoid message flood)
        if (!pending) {
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            const currentZoom = getMapInstance()?.getZoom() ?? 11;
            clusterWorker.cluster(rawTiles, currentZoom).then(clusters => {
              const keysThisFrame = new Set<string>();
              
              // Draw clusters exactly like tiles for now
              clusters.forEach(c => {
            const key = `c:${Math.round(c.x)}:${Math.round(c.y)}`;
            keysThisFrame.add(key);
            const sprite = tilePool.acquire(key);
            if (!sprite.parent) heatContainer.addChild(sprite);
            sprite.position.set(c.x - c.r, c.y - c.r);
            sprite.width = sprite.height = c.r * 2;

            // Color and fade
            const targetAlpha = Math.min(1, Math.log2(c.count + 2) / 5);
                
                const [red, green, blue] = hslToRgb(c.vibe.h, c.vibe.s, c.vibe.l);
                const vibeColor = (red << 16) + (green << 8) + blue;
                
                sprite.tint = vibeColor;
                sprite.alpha += (targetAlpha - sprite.alpha) * 0.2;
              });

              /* fast viewport cull – if sprite is way outside screen we drop immediately */
              tilePool.active.forEach((sprite, id) => {
                if (!id.startsWith('c:')) return;
                if (!keysThisFrame.has(id)) {          // disappeared cluster
                  tilePool.release(id);
                  return;
                }
                const { x, y, width } = sprite;
                if (x + width < -64 || x > app.screen.width + 64 ||
                    y + width < -64 || y > app.screen.height + 64) {
                  tilePool.release(id);
                }
              });
            });
          });
        }
      }

      // ---- PEOPLE DOTS ----
      if (people.length > 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PIXI_DEBUG] Rendering people dots:', people.length);
        }
        
        // Get existing sprites for pooling
        const existingSprites = peopleContainer.children.filter(child => 
          child !== myDotRef.current && child !== accuracyRef.current
        ) as Graphics[];
        
        // Hide excess sprites
        for (let i = people.length; i < existingSprites.length; i++) {
          existingSprites[i].visible = false;
        }
        
        // Re-add user dot if it was removed
        if (myDotRef.current && !myDotRef.current.parent) {
          peopleContainer.addChild(myDotRef.current);
        }
        
        // Update or create sprites for each person
        people.forEach((person, index) => {
          let dot = existingSprites[index] as Graphics;
          
          if (!dot) {
            dot = new Graphics();
            peopleContainer.addChild(dot);
          }
          
          // Parse color safely with fallback
          let color = 0x0066cc; // Default blue
          if (typeof person.color === 'string' && person.color.startsWith('#')) {
            const parsed = parseInt(person.color.replace('#',''), 16);
            color = isNaN(parsed) ? 0x0066cc : parsed;
          } else if (typeof person.color === 'string' && person.color.startsWith('hsl')) {
            // Simple HSL to hex conversion fallback
            color = 0x0066cc;
          }
          
          dot.clear();
          dot.beginFill(color);
          dot.drawCircle(0, 0, 8);
          dot.endFill();
          dot.position.set(person.x, person.y);
          dot.alpha = 0.8;
          dot.visible = true;
          
          // Add subtle border
          dot.lineStyle(2, 0xffffff, 0.3);
          dot.drawCircle(0, 0, 8);
        });
      } else if (process.env.NODE_ENV === 'development') {
        console.log('[PIXI_DEBUG] No people to render');
      }

      // ---- FLOQ EVENTS ----
      // Floqs are now rendered as Mapbox layers instead of PIXI sprites
      console.log('[PIXI_DEBUG] Floqs moved to Mapbox clustering');

      // ---- USER LOCATION DOT ----
      // TODO: Implement user location dot with PIXI.js projection
      if (myDotRef.current) myDotRef.current.visible = false;
      accuracyRef.current?.clear();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [fieldTiles, people, viewportGeo, searchViewport, floqs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        // Clean up floq sprites
        floqSpritesRef.current.forEach((sprite, floqId) => {
          console.log('[FLOQ_CLEANUP] Destroying sprite for floq:', floqId);
          try {
            sprite.destroy();
          } catch (e) {
            console.warn('[FLOQ_CLEANUP] Error destroying sprite:', e);
          }
        });
        floqSpritesRef.current.clear();
        
        // 1️⃣ empty the pool first (all Graphics still have a context)
        try {
          graphicsPoolRef.current?.releaseAll();
        } catch (e) {
          console.warn('[CLEANUP] Error releasing graphics pool:', e);
        }
        
        // 2️⃣ THEN destroy containers and clean up
        try {
          heatContainerRef.current?.removeChildren();
          peopleContainerRef.current?.removeChildren();
          tilePoolRef.current?.clearAll();
        } catch (e) {
          console.warn('[CLEANUP] Error clearing containers:', e);
        }
        
        // 3️⃣ Destroy the PIXI Application after cleanup
        if (appRef.current) {
          try {
            appRef.current.destroy(true, {
              children: true,
              texture: true
            });
          } catch (e) {
            console.warn('[CLEANUP] Error destroying PIXI app:', e);
          }
          appRef.current = null;
        }
      } catch (e) {
        console.error('[CLEANUP] Critical cleanup error:', e);
      }
    };
  }, []);

  //  [32mEnsure the main container uses zIndex('mapOverlay') and a border for debugging [0m
  return (
    <>
      <canvas 
        ref={actualRef}
        onClick={handleCanvasClick}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
        }}
      />
      {/* Debug info */}
      {/* tooltip portal */}
      <AnimatePresence>
        {tooltip && <ClusterTooltip {...tooltip} />}
      </AnimatePresence>
    </>
  );
});
