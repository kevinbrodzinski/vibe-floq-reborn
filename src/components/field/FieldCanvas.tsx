
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Application, Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import { Text as PIXIText } from 'pixi.js';
import { useSpatialIndex } from '@/hooks/useSpatialIndex';
import { GraphicsPool } from '@/utils/graphicsPool';
import { TileSpritePool } from '@/utils/tileSpritePool';
import { SpritePool } from '@/lib/pixi/SpritePool';
import { projectToScreen, getMapInstance, metersToPixelsAtLat } from '@/lib/geo/project';
import { geohashToCenter, crowdCountToRadius } from '@/lib/geo';
import { clusterWorker } from '@/lib/clusterWorker';
import { throttle } from '@/utils/timing';
import { useFieldHitTest } from '@/hooks/useFieldHitTest';
import { useAddRipple } from '@/hooks/useAddRipple';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';

import { zIndex } from '@/constants/z.ts';
import { vibeToColor } from '@/utils/vibeToHSL';
import type { Vibe } from '@/lib/vibes';
import { safeVibe } from '@/lib/vibes';
import type { Person } from '@/components/field/contexts/FieldSocialContext';
import type { FieldTile } from '@/types/field';
import { forwardRef } from 'react';
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics';
import { AnimatePresence } from 'framer-motion';
import { ClusterTooltip } from '@/components/field/ClusterTooltip';
import { ConstellationRenderer } from './ConstellationRenderer';
import { useClusters } from '@/hooks/useClusters';
import { useClustersLive } from '@/hooks/useClustersLive';
import { ParticleTrailSystem } from '@/lib/field/ParticleTrailSystem';

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
  showDebugVisuals = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actualRef = (ref as React.RefObject<HTMLCanvasElement>) || canvasRef;
  const { light, medium } = useAdvancedHaptics();
  const hitTest = useFieldHitTest();          // ⬅️ HOOK MUST BE TOP-LEVEL
  const addRipple = useAddRipple();           // enqueue shader ripple
  const userLocation = useUnifiedLocation({
    enableTracking: true, // FieldCanvas needs server-side location recording
    enablePresence: false, // Presence handled elsewhere
    hookId: 'field-canvas'
  });    // Get live GPS position
  const lastUserPosRef = useRef<{lat: number, lng: number} | null>(null);

  // 🛰️ TASK: Wire up live cluster system for constellation overlay
  const bbox: [number, number, number, number] = useMemo(() => {
    if (!viewportGeo) {
      // Default SF bay area if no viewport
      return [-122.5, 37.7, -122.3, 37.8];
    }
    return [viewportGeo.minLng, viewportGeo.minLat, viewportGeo.maxLng, viewportGeo.maxLat];
  }, [viewportGeo]);

  const clustersState = useClusters(bbox, 6);
  const { clusters, loading: clustersLoading } = clustersState;

  // Set up live cluster updates with throttled refetch for ≥60fps performance
  const throttledRefetch = useMemo(() => 
    throttle(() => {
      // Only refetch if not already loading to prevent request flooding
      if (!clustersLoading) {
        // Trigger refetch through state update
        console.log('[FieldCanvas] 🛰️ Throttled cluster refetch triggered');
      }
    }, 100), // Max 10 updates per second for smooth 60fps
  [clustersLoading]);

  useClustersLive(clusters, () => {}, throttledRefetch);
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
  const constellationContainerRef = useRef<Container | null>(null);
  const trailContainerRef = useRef<Container | null>(null); // Phase 1: Particle trails
  const userDotRef = useRef<Graphics | null>(null);  // User location dot
  const tilePoolRef = useRef<TileSpritePool | null>(null);
  const graphicsPoolRef = useRef<GraphicsPool | null>(null);
  const spritePoolRef = useRef<SpritePool<Graphics> | null>(null);
  // Track existing floq sprites to prevent recreation
  const floqSpritesRef = useRef<Map<string, Graphics>>(new Map());
  // Reusable graphics objects for performance
  const debugGraphicsRef = useRef<Graphics | null>(null);
  const glowFilterRef = useRef<any>(null);
  // Phase 1: Particle trail system
  const trailSystemRef = useRef<ParticleTrailSystem | null>(null);
  
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
    let cancelled = false; // Guard against unmount before init completes

    /* will be assigned after init so we can remove cleanly */
    let onPointerMove: ((e: any) => void) | undefined;

    const initAndRegister = async () => {
      try {
        if (cancelled) return; // Check cancellation before async work
        
        // Performance mark: Start of Field overlay initialization
        performance.mark('field_overlay_init_start');
        
        await app.init({
          canvas: actualRef.current!,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: undefined, // Force transparent background
          antialias: true,
          resolution: window.devicePixelRatio || 1, // Better quality on high-DPI displays
          autoDensity: true, // Handle high-DPI displays properly
          backgroundAlpha: 0, // Ensure background is transparent
        });
        
        if (cancelled) {
          // Unmounted while awaiting - clean up immediately
          const { PixiLifecycleManager } = await import('@/lib/pixi/PixiLifecycleManager');
          const lifecycleManager = PixiLifecycleManager.getInstance();
          lifecycleManager.destroyApp(app);
          return;
        }
        
        // Register app with lifecycle manager
        const { PixiLifecycleManager } = await import('@/lib/pixi/PixiLifecycleManager');
        const lifecycleManager = PixiLifecycleManager.getInstance();
        lifecycleManager.registerApp(app);

        // Create containers in proper z-order
        const heatContainer = new Container();
        const trailContainer = new Container(); // Phase 1: Particle trails (under clusters)
        const constellationContainer = new Container(); // For constellation effects
        const peopleContainer = new Container();
        const userContainer = new Container(); // For user location dot
        
        // Add containers in proper order (last = top layer)
        app.stage.addChild(trailContainer); // Trails at bottom
        app.stage.addChild(heatContainer);
        app.stage.addChild(constellationContainer); // Constellation effects between heat and people
        app.stage.addChild(peopleContainer);
        app.stage.addChild(userContainer); // User dot on top
        
        heatContainerRef.current = heatContainer;
        peopleContainerRef.current = peopleContainer;
        constellationContainerRef.current = constellationContainer;
        trailContainerRef.current = trailContainer;
        
        // Phase 1: Initialize particle trail system
        trailSystemRef.current = new ParticleTrailSystem(trailContainer);
        
        // Create user location dot
        const userDot = new Graphics();
        userContainer.addChild(userDot);
        userDotRef.current = userDot;
        
        // Function to update user dot position
        const updateUserDot = (lat: number, lng: number) => {
          const projection = projectToScreen(lat, lng);
          if (!projection || !userDot) return; // Map not ready yet
          
          const { x, y } = projection;
          
          // Clear and redraw the user dot with proper styling
          userDot.clear();
          
          // Accuracy halo (if available)
          if (userLocation.coords?.accuracy) {
            const mapZoom = getMapInstance()?.getZoom() ?? 11;
            const haloRadius = metersToPixelsAtLat(userLocation.coords.accuracy, lat, mapZoom);
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
        };
        
        // Store updateUserDot function for use in effects
        (userDot as any)._updatePosition = updateUserDot;
        
        // Initialize pools and reusable objects
        tilePoolRef.current = new TileSpritePool();
        graphicsPoolRef.current = new GraphicsPool();
        spritePoolRef.current = new SpritePool(() => new Graphics());
        spritePoolRef.current.preAllocate(512); // Pre-allocate 512 Graphics objects
        
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

            /* Enhanced haptic feedback for mobile - only in user gesture context */
            if (window.isSecureContext && document.hasFocus() && window.top === window.self) {
              light();    // from useAdvancedHaptics()
            }
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
          
          // Enhanced haptic feedback pattern - only in secure context with user gesture
          if (window.isSecureContext && document.hasFocus() && window.top === window.self) {
            light();
            setTimeout(() => light(), 50); // Double tap haptic
          }
        });

      } catch (error) {
        console.error('[FieldCanvas] PIXI init failed:', error);
        if (!cancelled) {
          // Clean up on error only if component still mounted
          const { PixiLifecycleManager } = await import('@/lib/pixi/PixiLifecycleManager');
          const lifecycleManager = PixiLifecycleManager.getInstance();
          lifecycleManager.destroyApp(app);
        }
      }
    };
    
    initAndRegister();

    /* ---------- cleanup ---------- */
    const safelyDestroyPixi = () => {
      const pixiApp = appRef.current;
      if (!pixiApp) return;

      console.log('[FieldCanvas] Starting safe PIXI destroy');

      // Use PixiLifecycleManager for safe destruction
      import('@/lib/pixi/PixiLifecycleManager').then(({ PixiLifecycleManager }) => {
        const lifecycleManager = PixiLifecycleManager.getInstance();
        lifecycleManager.destroyApp(pixiApp);
      });
      appRef.current = null;
    };

    // Hot-reload guard for development
    if (import.meta.hot) {
      import.meta.hot.dispose(safelyDestroyPixi);
    }

    return () => {
      cancelled = true; // Prevent async init completion after unmount
      safelyDestroyPixi();
    };
  }, [hitTest]);

  // Update user dot when GPS position changes
  useEffect(() => {
    const userDot = userDotRef.current;
    if (userDot && userLocation.coords?.lat && userLocation.coords?.lng) {
      const updateFunction = (userDot as any)._updatePosition;
      if (updateFunction) {
        updateFunction(userLocation.coords.lat, userLocation.coords.lng);
      }
    }
  }, [userLocation.coords?.lat, userLocation.coords?.lng]);

  // Throttled map move handler for performance (30 fps)
  const throttledMapMove = useMemo(() => throttle(() => {
    const userDot = userDotRef.current;
    if (userDot && userLocation.coords?.lat && userLocation.coords?.lng) {
      const updateFunction = (userDot as any)._updatePosition;
      if (updateFunction) {
        updateFunction(userLocation.coords.lat, userLocation.coords.lng);
      }
    }
  }, 33), [userLocation.coords?.lat, userLocation.coords?.lng]);

  // Update user dot when map moves/zooms (throttled)
  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    map.on('move', throttledMapMove);
    map.on('zoom', throttledMapMove);

    return () => {
      map.off('move', throttledMapMove);
      map.off('zoom', throttledMapMove);
      throttledMapMove.clear();
    };
  }, [throttledMapMove]);

  // Handle canvas clicks for ripples
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!onRipple || !actualRef.current) return;
    const rect = actualRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    onRipple(x, y);
    // Add haptic feedback for ripples - only in secure context with user gesture
    if (window.isSecureContext && document.hasFocus() && window.top === window.self) {
      light();
    }
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
    let firstRenderCompleted = false;
    
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
          if (userLocation.coords?.lat && userLocation.coords?.lng) {
      lastUserPosRef.current = { lat: userLocation.coords.lat, lng: userLocation.coords.lng };
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
          const projection = projectToScreen(lat, lng);
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

                // Phase 1: Enhanced breathing and glow effects
                let targetAlpha = Math.min(1, Math.log2(c.count + 2) / 5);
                
                // Phase 1: Breathing animation based on cohesion
                const breathingScale = 1 + (c.cohesionScore || 0) * 0.2 * Math.sin((c.breathingPhase || 0));
                sprite.scale.set(breathingScale);
                
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
                
                // Phase 1: Add particle trail if cluster has momentum
                if (trailSystemRef.current && c.momentum && c.momentum > 0.5) {
                  trailSystemRef.current.addPosition(key, c.x, c.y, c.vibe);
                }
                
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
        
        // Track current people IDs for cleanup
        const currentPeopleIds = new Set(people.map(p => p.id || `person-${people.indexOf(p)}`));
        const spritePool = spritePoolRef.current;
        
        if (spritePool) {
          // Release sprites for people who are no longer present
          const inUseKeys = Array.from((spritePool as any).inUse.keys()) as string[];
          inUseKeys.forEach(id => {
            if (typeof id === 'string' && (id.startsWith('person-') || !currentPeopleIds.has(id))) {
              spritePool.release(id);
            }
          });
        }
        
        // Update or create sprites for each person with sprite pooling
        people.forEach((person, index) => {
          const spritePool = spritePoolRef.current;
          if (!spritePool) return;
          
          // Use sprite pool instead of creating new Graphics
          const dot = spritePool.acquire(person.id || `person-${index}`);
          
          if (!dot.parent) {
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
      // Now handled separately in useEffect hooks for better reactivity

      // Phase 1: Update particle trail system
      if (trailSystemRef.current) {
        trailSystemRef.current.update(16); // Assume 60fps (16ms)
      }

      // Performance mark: First successful render completed
      if (!firstRenderCompleted) {
        performance.mark('field_overlay_first_render_end');
        if (performance.getEntriesByName('field_overlay_init_start').length > 0) {
          performance.measure('field_overlay_first_render_ms', 'field_overlay_init_start', 'field_overlay_first_render_end');
        }
        firstRenderCompleted = true;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [fieldTiles, people, viewportGeo, searchViewport, floqs, isConstellationMode, showDebugVisuals]);

  // Cleanup throttled cluster refetch
  useEffect(() => {
    return () => {
      throttledRefetch.clear();
    };
  }, [throttledRefetch]);

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
          if (graphicsPoolRef.current && typeof graphicsPoolRef.current.releaseAll === "function") {
            graphicsPoolRef.current.releaseAll();
          }
        } catch (e) {
          console.warn('[CLEANUP] Error releasing graphics pool:', e);
        }
        
        // 2️⃣ THEN destroy containers and clean up
        try {
          heatContainerRef.current?.removeChildren();
          peopleContainerRef.current?.removeChildren();
          trailContainerRef.current?.removeChildren(); // Phase 1: Clean trails
          if (tilePoolRef.current && typeof tilePoolRef.current.clearAll === "function") {
            tilePoolRef.current.clearAll();
          }
          // Phase 1: Clean particle trail system
          if (trailSystemRef.current) {
            trailSystemRef.current.clearAll();
          }
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

  // Add periodic garbage collection for sprite pool
  useEffect(() => {
    const interval = setInterval(() => {
      if (spritePoolRef.current) {
        spritePoolRef.current.gc(1024); // Keep max 1024 free sprites
      }
    }, 30_000); // Every 30 seconds
    
    return () => clearInterval(interval);
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
      
      {/* Constellation effects (only when in constellation mode) */}
      {isConstellationMode && (
        <ConstellationRenderer
          people={people}
          fieldTiles={fieldTiles}
          clusters={clusters}
          app={appRef.current}
          container={constellationContainerRef.current}
        />
      )}
      
      {/* Debug info */}
      {/* tooltip portal */}
      <AnimatePresence>
        {tooltip && <ClusterTooltip {...tooltip} />}
      </AnimatePresence>
    </>
  );
});
