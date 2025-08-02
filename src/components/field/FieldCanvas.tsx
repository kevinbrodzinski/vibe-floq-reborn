
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Application, Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import { Text as PIXIText } from 'pixi.js';
import { useSpatialIndex } from '@/hooks/useSpatialIndex';
import { GraphicsPool } from '@/utils/graphicsPool';
import { TileSpritePool } from '@/utils/tileSpritePool';
import { projectLatLng, getMapInstance, metersToPixelsAtLat } from '@/lib/geo/project';
import { geohashToCenter, crowdCountToRadius } from '@/lib/geo';
import { clusterWorker } from '@/lib/clusterWorker';
import { useFieldHitTest } from '@/hooks/useFieldHitTest';
import { useAddRipple } from '@/hooks/useAddRipple';
import { useUserLocation } from '@/hooks/useUserLocation';

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
  isConstellationMode?: boolean;
  timeWarpHour?: number;
  showDebugVisuals?: boolean;
}

export const FieldCanvas = forwardRef<HTMLCanvasElement, FieldCanvasProps>(({
  people = [],
  floqs = [],
  tileIds = [],
  fieldTiles = [],
  viewportGeo,
  onRipple,
  isConstellationMode = false,
  timeWarpHour = new Date().getHours(),
  showDebugVisuals = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actualRef = (ref as React.RefObject<HTMLCanvasElement>) || canvasRef;
  const { light, medium } = useAdvancedHaptics();
  const hitTest = useFieldHitTest();          // ⬅️ HOOK MUST BE TOP-LEVEL
  const addRipple = useAddRipple();           // enqueue shader ripple
  const userLocation = useUserLocation();    // Get live GPS position
  const lastUserPosRef = useRef<{lat: number, lng: number} | null>(null);
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

  // Refs for PIXI containers and sprites
  const peopleContainerRef = useRef<Container | null>(null);
  const heatContainerRef = useRef<Container | null>(null);
  const userDotRef = useRef<Graphics | null>(null);  // User location dot
  const tilePoolRef = useRef<TileSpritePool | null>(null);
  const graphicsPoolRef = useRef<GraphicsPool | null>(null);
  // Track existing floq sprites to prevent recreation
  const floqSpritesRef = useRef<Map<string, Graphics>>(new Map());
  // Reusable graphics objects for performance
  const debugGraphicsRef = useRef<Graphics | null>(null);
  const glowFilterRef = useRef<any>(null);
  
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
      const userContainer = new Container(); // For user location dot
      
      // Add containers in proper order (last = top layer)
      app.stage.addChild(heatContainer);
      app.stage.addChild(peopleContainer);
      app.stage.addChild(userContainer); // User dot on top
      
      heatContainerRef.current = heatContainer;
      peopleContainerRef.current = peopleContainer;
      
      // Create user location dot
      const userDot = new Graphics();
      userContainer.addChild(userDot);
      userDotRef.current = userDot;
      
      // Initialize pools and reusable objects
      tilePoolRef.current = new TileSpritePool();
      graphicsPoolRef.current = new GraphicsPool();
      
      // Pre-create reusable debug graphics
      debugGraphicsRef.current = new Graphics();

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

          /* GPU ripple with enhanced feedback */
          addRipple(clientX, clientY);

          /* Enhanced haptic feedback for mobile */
          light();    // from useAdvancedHaptics()
        });
      };

      // Enhanced pointer events for better interaction
      app.stage.eventMode = 'static';
      app.stage.interactive = true;
      app.stage.on('pointermove', onPointerMove);
      
      // Enhanced click handler with ripple effects and haptic feedback
      app.stage.on('pointerdown', (e: any) => {
        const { clientX, clientY } = e.data?.originalEvent || { clientX: e.globalX, clientY: e.globalY };
        
        // Add multiple ripples for enhanced visual feedback
        addRipple(clientX, clientY);
        setTimeout(() => addRipple(clientX, clientY), 100); // Secondary ripple
        
        // Enhanced haptic feedback pattern
        light();
        setTimeout(() => light(), 50); // Double tap haptic
      });
    });

    /* ---------- cleanup ---------- */
    return () => {
      if (onPointerMove) {
        app.stage.off('pointermove', onPointerMove);
        app.stage.off('pointerdown'); // Clean up click handlers too
      }
      // Remove any ticker callbacks to prevent dangling references
      if (app.ticker) {
        app.ticker.stop();
        app.ticker.destroy();
      }
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
      // Update cached user position if new data is available
      if (userLocation.pos?.lat && userLocation.pos?.lng) {
        lastUserPosRef.current = { lat: userLocation.pos.lat, lng: userLocation.pos.lng };
      }
      
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
        
        // Build raw tiles for worker with constellation mode support
        const rawTiles = visibleTiles.map(tile => {
          const [lat, lng] = geohashToCenter(tile.tile_id);
          const projection = projectLatLng(lng, lat);
          if (!projection) return null; // Skip if map not ready
          const { x, y } = projection;
          const radius = crowdCountToRadius(tile.crowd_count);
          
          // Adjust visualization based on constellation mode and time
          let adjustedRadius = radius;
          let adjustedVibe = tile.avg_vibe;
          
          if (isConstellationMode) {
            // In constellation mode, make clusters more star-like
            adjustedRadius = radius * 0.7; // Smaller, more focused points
            adjustedVibe = {
              ...tile.avg_vibe,
              l: Math.min(0.8, tile.avg_vibe.l + 0.2) // Brighter for constellation effect
            };
          }
          
          return {
            id: tile.tile_id,
            x, y, r: adjustedRadius,
            vibe: adjustedVibe,
            opacity: isConstellationMode ? 0.6 : 1.0
          };
        }).filter(Boolean); // Remove null entries when map not ready

        // Get clusters from worker (throttled to avoid message flood)
        if (!pending) {
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            const currentZoom = getMapInstance()?.getZoom() ?? 11;
            clusterWorker.cluster(rawTiles, currentZoom).then(clusters => {
              const keysThisFrame = new Set<string>();
              
              // Draw clusters with constellation mode support
              clusters.forEach(c => {
                const key = `c:${Math.round(c.x)}:${Math.round(c.y)}`;
                keysThisFrame.add(key);
                const sprite = tilePool.acquire(key);
                if (!sprite.parent) heatContainer.addChild(sprite);
                
                sprite.position.set(c.x - c.r, c.y - c.r);
                sprite.width = sprite.height = c.r * 2;

                // Enhanced color and fade with constellation mode
                let targetAlpha = Math.min(1, Math.log2(c.count + 2) / 5);
                
                if (isConstellationMode) {
                  // Constellation mode: pulsing effect and enhanced glow
                  const pulseIntensity = 0.2 + 0.3 * Math.sin(Date.now() * 0.003 + c.x * 0.01);
                  targetAlpha = Math.min(1, targetAlpha * (0.8 + pulseIntensity));
                  
                  // Add subtle glow effect (commenting out filters to fix TS error)
                  // sprite.filters = sprite.filters || [];
                  // Note: In a real implementation, you'd add a glow filter here
                }
                
                const [red, green, blue] = hslToRgb(c.vibe.h, c.vibe.s, c.vibe.l);
                const vibeColor = (red << 16) + (green << 8) + blue;
                
                sprite.tint = vibeColor;
                sprite.alpha += (targetAlpha - sprite.alpha) * 0.2;
                
                // Debug visualization with reused graphics
                if (showDebugVisuals && debugGraphicsRef.current) {
                  const debugGraphics = debugGraphicsRef.current;
                  debugGraphics.clear();
                  debugGraphics.lineStyle(1, 0x00ff00, 0.5);
                  debugGraphics.drawRect(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
                  if (!debugGraphics.parent) {
                    heatContainer.addChild(debugGraphics);
                  }
                }
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
        // Log in development and preview environments  
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_STAGE !== 'prod') {
          console.log('[PIXI_DEBUG] Rendering people dots:', people.length);
        }
        
        // Efficient sprite pooling - reuse existing Graphics objects
        const existingSprites = peopleContainer.children as Graphics[];
        
        // Hide excess sprites instead of destroying them
        for (let i = people.length; i < existingSprites.length; i++) {
          existingSprites[i].visible = false;
          existingSprites[i].clear(); // Clear but don't destroy
        }
        
        // Re-add any existing built-in user location elements that may have been cleared
        
        // Update or create sprites for each person with constellation mode
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
            // TODO: Improve HSL parsing with regex + tinycolor2 for accurate hue conversion
            // For now, extract hue from hsl(h, s%, l%) format for basic color approximation
            const hslMatch = person.color.match(/hsl\((\d+)/);
            if (hslMatch) {
              const hue = parseInt(hslMatch[1]);
              // Simple hue to RGB conversion (at 70% saturation, 60% lightness)
              const hueToRgb = (h: number) => {
                const c = 0.7 * 0.4; // saturation * (1 - |2*lightness - 1|)
                const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
                const m = 0.6 - c/2; // lightness - chroma/2
                let r = 0, g = 0, b = 0;
                if (h < 60) { r = c; g = x; b = 0; }
                else if (h < 120) { r = x; g = c; b = 0; }
                else if (h < 180) { r = 0; g = c; b = x; }
                else if (h < 240) { r = 0; g = x; b = c; }
                else if (h < 300) { r = x; g = 0; b = c; }
                else { r = c; g = 0; b = x; }
                return ((Math.round((r + m) * 255) << 16) + (Math.round((g + m) * 255) << 8) + Math.round((b + m) * 255));
              };
              color = hueToRgb(hue);
            }
          }
          
          dot.clear();
          
          // Constellation mode: enhanced visual effects for friends
          if (isConstellationMode && person.isFriend) {
            // Create star-like effect with cached pulse calculation
            const baseRadius = 10;
            const timeOffset = Date.now() * 0.004 + index;
            const pulseIntensity = 0.8 + 0.4 * Math.sin(timeOffset);
            
            // Outer glow
            dot.beginFill(color, 0.2 * pulseIntensity);
            dot.drawCircle(0, 0, baseRadius * 2);
            dot.endFill();
            
            // Inner bright core
            dot.beginFill(color, 0.9);
            dot.drawCircle(0, 0, baseRadius * pulseIntensity);
            dot.endFill();
            
            // Optimized sparkle effect - pre-calculate angles
            dot.lineStyle(1, 0xffffff, 0.7 * pulseIntensity);
            const sparkleTime = Date.now() * 0.001;
            const sparkleDistance = baseRadius * 1.5;
            
            for (let i = 0; i < 4; i++) {
              const angle = (i * Math.PI * 0.5) + sparkleTime;
              const x1 = Math.cos(angle) * sparkleDistance;
              const y1 = Math.sin(angle) * sparkleDistance;
              dot.moveTo(x1 * 0.5, y1 * 0.5);
              dot.lineTo(x1, y1);
            }
          } else {
            // Regular mode or non-friends
            const radius = person.isFriend ? 10 : 8;
            dot.beginFill(color);
            dot.drawCircle(0, 0, radius);
            dot.endFill();
            
            // Add border
            const borderAlpha = person.isFriend ? 0.4 : 0.3;
            dot.lineStyle(person.isFriend ? 2 : 1, 0xffffff, borderAlpha);
            dot.drawCircle(0, 0, radius);
          }
          
          // Enhanced positioning with precise geographic distance calculation
          try {
            if (typeof person.x === 'number' && typeof person.y === 'number') {
              // Ensure position is within valid bounds (prevent dots from disappearing off-screen)
              const clampedX = Math.max(-100, Math.min(window.innerWidth + 100, person.x));
              const clampedY = Math.max(-100, Math.min(window.innerHeight + 100, person.y));
              dot.position.set(clampedX, clampedY);
            } else {
              // Fallback to center if coordinates are invalid
              dot.position.set(window.innerWidth / 2, window.innerHeight / 2);
            }
          } catch (error) {
            console.warn('[PIXI_DEBUG] Error positioning person dot:', error);
            dot.position.set(window.innerWidth / 2, window.innerHeight / 2);
          }
          
          // Enhanced visibility with better contrast for friends
          dot.alpha = person.isFriend ? 0.95 : 0.8;
          dot.visible = true;
          
          // Add interactive behavior for dots
          dot.eventMode = 'static';
          dot.cursor = 'pointer';
        });
      } else if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_STAGE !== 'prod') {
        console.log('[PIXI_DEBUG] No people to render');
      }

      // ---- FLOQ EVENTS ----
      // Floqs are now rendered as Mapbox layers instead of PIXI sprites
      console.log('[PIXI_DEBUG] Floqs moved to Mapbox clustering');

      // ---- USER LOCATION DOT ----
      const userDot = userDotRef.current;
      if (userDot && lastUserPosRef.current) {
        const position = lastUserPosRef.current;
        const projection = projectLatLng(position.lng, position.lat);
        
        // Only render if projection is successful (map is ready)
        if (projection) {
          const { x, y } = projection;
          
          userDot.clear();
          
          // Accuracy halo (if available)
          if (userLocation.pos?.accuracy) {
            const mapZoom = getMapInstance()?.getZoom() ?? 11;
            const haloRadius = metersToPixelsAtLat(userLocation.pos.accuracy, position.lat, mapZoom);
            userDot.beginFill(0x0066cc, 0.1);
            userDot.drawCircle(0, 0, haloRadius);
            userDot.endFill();
          }
          
          // Outer ring (14px semi-transparent blue)
          userDot.beginFill(0x0066cc, 0.3);
          userDot.drawCircle(0, 0, 14);
          userDot.endFill();
          
          // Inner dot (8px solid blue)
          userDot.beginFill(0x0066cc, 1.0);
          userDot.drawCircle(0, 0, 8);
          userDot.endFill();
          
          // White border for contrast
          userDot.lineStyle(2, 0xffffff, 0.8);
          userDot.drawCircle(0, 0, 8);
          
          userDot.position.set(x, y);
          userDot.visible = true;
        }
      } else if (userDot) {
        userDot.visible = false;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [fieldTiles, people, viewportGeo, searchViewport, floqs, isConstellationMode, timeWarpHour, showDebugVisuals]);

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
            // Clear pooled sprite maps to prevent texture leaks
            if (floqSpritesRef.current) {
              floqSpritesRef.current.forEach(sprite => sprite.destroy());
              floqSpritesRef.current.clear();
            }
            
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
