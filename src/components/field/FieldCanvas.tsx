
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Application, Container, Graphics, Sprite, Texture, Text } from 'pixi.js';
import { Text as PIXIText } from 'pixi.js';
import { useSpatialIndex } from '@/hooks/useSpatialIndex';
import { GraphicsPool } from '@/utils/graphicsPool';
import { TileSpritePool } from '@/utils/tileSpritePool';
import { SpritePool } from '@/lib/pixi/SpritePool';
import { projectToScreen, getMapInstance, metersToPixelsAtLat } from '@/lib/geo/project';
import { geohashToCenter, crowdCountToRadius } from '@/lib/geo';
import { getClusterWorker, isWorkerFallback } from '@/lib/clusterWorker';
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
import { ConvergenceOverlay } from './overlays/ConvergenceOverlay';
import { FlowFieldOverlay } from './overlays/FlowFieldOverlay';
import { ConvergenceLanes } from './overlays/ConvergenceLanes';
import { PressureOverlay } from './overlays/PressureOverlay';
import { StormOverlay } from './overlays/StormOverlay';
import { MomentumBadge } from './badges/MomentumBadge';
import { BreathingSystem } from '@/lib/field/BreathingSystem';
import { LightningOverlay } from './overlays/LightningOverlay';
import { PrecipOverlay } from './overlays/PrecipOverlay';
import { VibeCompassOverlay } from './overlays/VibeCompassOverlay';
import { AltitudeController } from '@/features/field/layers/AltitudeController';
import { SocialWeatherTracker } from '@/features/field/status/SocialWeatherComposer';
import { debugFieldVectors } from '@/lib/debug/flags';
import { useFieldPerformance, setPerformanceCounters, emitWorkerPerfEvent, getQualitySettings, shouldReduceQuality } from '@/hooks/useFieldPerformance';
import type { SocialCluster, ConvergenceEvent } from '@/types/field';
import { ATMO, FIELD_LOD, P3, P3B, P4 } from '@/lib/field/constants';
import { TradeWindOverlay } from './overlays/TradeWindOverlay';
import { AuroraOverlay } from './overlays/AuroraOverlay';
import { AtmoTintOverlay } from './overlays/AtmoTintOverlay';
import { useWeatherModulation } from '@/hooks/useWeatherModulation';
import { logWorkerModeOnce } from '@/lib/debug/workerMode';
import { startWindsLogger } from '@/features/field/winds/windsLogger';
import { useAuth } from '@/hooks/useAuth';
import { devRefreshWindsNow } from '@/utils/devRefreshWinds';
import { fetchTradeWindsForViewport, hourBucket, currentPixelBBox, seedTradeWindsIfEmpty } from '@/features/field/winds/windsHelpers';
import { resolveFromViewport } from '@/lib/field/cityResolver';
import { Phase4Hud } from '@/components/debug/Phase4Hud';
import { detectAurorasFromStorms } from '@/features/field/aurora/auroraDetect';

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

  // Use state for PIXI app to trigger re-renders when ready
  const [pixiApp, setPixiApp] = useState<Application | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Phase 3: Performance monitoring
  const { metrics, deviceTier } = useFieldPerformance(pixiApp);
  
  // Phase 4: Weather modulation
  const centerLat = viewportGeo ? (viewportGeo.minLat + viewportGeo.maxLat) / 2 : undefined;
  const centerLng = viewportGeo ? (viewportGeo.minLng + viewportGeo.maxLng) / 2 : undefined;
  const { weather, modulation } = useWeatherModulation(centerLat, centerLng);

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
  const overlayContainerRef = useRef<Container | null>(null); // Phase 2: Convergence overlay
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
  // Phase 2: Convergence overlay and breathing system
  const convergenceOverlayRef = useRef<ConvergenceOverlay | null>(null);
  const breathingSystemRef = useRef<BreathingSystem | null>(null);
  // Phase 3: Flow field, lanes, and momentum
  const flowFieldOverlayRef = useRef<FlowFieldOverlay | null>(null);
  const convergenceLanesRef = useRef<ConvergenceLanes | null>(null);
  const momentumBadgeRef = useRef<MomentumBadge | null>(null);
  const { user } = useAuth();
  
  // Phase 3B: Atmospheric overlays
  const pressureOverlayRef = useRef<PressureOverlay | null>(null);
  const stormOverlayRef = useRef<StormOverlay | null>(null);
  // Phase 4: Atmospheric memory & mood overlays
  const tradeWindOverlayRef = useRef<TradeWindOverlay | null>(null);
  // Social Weather System: Lightning, Precip, and Altitude Controller
  const lightningOverlayRef = useRef<LightningOverlay | null>(null);
  const precipOverlayRef = useRef<PrecipOverlay | null>(null);
  const altitudeControllerRef = useRef<AltitudeController | null>(null);
  const vibeCompassOverlayRef = useRef<VibeCompassOverlay | null>(null);
  const auroraOverlayRef = useRef<AuroraOverlay | null>(null);
  const atmoTintOverlayRef = useRef<AtmoTintOverlay | null>(null);
  
  // Social Weather Tracker
  const socialWeatherTrackerRef = useRef<SocialWeatherTracker | null>(null);
  
  // Feature flags for Phase 4
  const [phase4Flags] = useState({
    tint_enabled: true,
    weather_enabled: true,
    winds_enabled: true, // Enable for testing
    aurora_enabled: true // Enable for testing - was false
  });
  const clustersRef = useRef<SocialCluster[]>([]);
  const previousClustersRef = useRef<SocialCluster[]>([]);
  const clusterVelocitiesRef = useRef<Map<string, { vx: number; vy: number; momentum: number }>>(new Map());
  const currentZoomRef = useRef<number>(11);
  
  // Phase 3: Throttled worker calls
  const lastFlowRef = useRef(0);
  const lastLaneRef = useRef(0);
  // Phase 3B: Atmospheric throttling
  const lastPressureRef = useRef(0);
  const lastStormRef = useRef(0);
  // Phase 4: Atmospheric throttling
  const lastAtmoTintRef = useRef(0);
  const lastWeatherRef = useRef(0);
  const lastWindsRef = useRef(0);
  
  // Phase 4: Storm groups for aurora detection
  const lastStormGroupsRef = useRef<any[]>([]);
  
  // Phase 4: HUD counters for performance monitoring
  const [phase4HudCounters, setPhase4HudCounters] = useState({
    windsPaths: 0,
    arrowsVisible: 0,
    auroraActive: 0,
  });
  // Adjust intervals based on worker fallback
  const isFallback = isWorkerFallback();
  
  // Dynamic caps based on fallback mode (don't mutate readonly constants)
  const maxArrows = isFallback ? Math.min(P3.FLOW.MAX_ARROWS, 300) : P3.FLOW.MAX_ARROWS;
  const flowUpdateHz = isFallback ? Math.min(P3.FLOW.UPDATE_HZ, 4) : P3.FLOW.UPDATE_HZ;
  const maxLanes = isFallback ? Math.min(P3.LANES.MAX_LANES, 20) : P3.LANES.MAX_LANES;
  const maxPressureCells = isFallback ? Math.min(P3B.PRESSURE.MAX_CELLS, 250) : P3B.PRESSURE.MAX_CELLS;
  const pressureUpdateHz = isFallback ? Math.min(P3B.PRESSURE.UPDATE_HZ, 4) : P3B.PRESSURE.UPDATE_HZ;

  const FLOW_INTERVAL_MS = 1000 / flowUpdateHz;
  const LANE_INTERVAL_MS = isFallback ? 300 : 250;
  const PRESS_INTERVAL_MS = 1000 / pressureUpdateHz;
  const MOMENTUM_INTERVAL_MS = 450;
  
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

  // Wait for map to be ready before initializing PIXI
  useEffect(() => {
    // Log worker mode once at boot
    logWorkerModeOnce();
    
    // For now, assume map is ready immediately
    // In a real Mapbox integration, you'd listen for map 'load' event
    setMapReady(true);
  }, []);

  const { searchViewport } = useSpatialIndex(spatialPeople);

  // Initialize PIXI app only after map is ready
  useEffect(() => {
    if (!actualRef.current || !mapReady || pixiApp) return;

    const app = new Application();
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
          try { app.destroy(true); } catch {}
          return;
        }
        
        // Register app with lifecycle manager and set state
        const { PixiLifecycleManager } = await import('@/lib/pixi/PixiLifecycleManager');
        const lifecycleManager = PixiLifecycleManager.getInstance();
        lifecycleManager.registerApp(app);
        
        // Set the app in state to trigger re-renders
        setPixiApp(app);

        // Create containers in proper z-order
        const heatContainer = new Container();
        const trailContainer = new Container(); // Phase 1: Particle trails (under clusters)
        const overlayContainer = new Container(); // Phase 2: Convergence overlay (above clusters)
        const constellationContainer = new Container(); // For constellation effects
        const peopleContainer = new Container();
        const userContainer = new Container(); // For user location dot
        
        // Add containers in proper order (last = top layer)
        app.stage.addChild(trailContainer); // Trails at bottom
        app.stage.addChild(heatContainer);
        app.stage.addChild(overlayContainer); // Convergence overlay above clusters
        app.stage.addChild(constellationContainer); // Constellation effects between heat and people
        app.stage.addChild(peopleContainer);
        app.stage.addChild(userContainer); // User dot on top
        
        heatContainerRef.current = heatContainer;
        peopleContainerRef.current = peopleContainer;
        constellationContainerRef.current = constellationContainer;
        trailContainerRef.current = trailContainer;
        overlayContainerRef.current = overlayContainer;
        
        // Phase 1: Initialize particle trail system
        trailSystemRef.current = new ParticleTrailSystem(trailContainer);
        
        // Phase 2: Initialize breathing system with renderer (RN-safe)
        breathingSystemRef.current = new BreathingSystem(heatContainer, app.renderer);
        
        // Phase 2: Expose breathing system for debugging
        if (import.meta.env.DEV) {
          (window as any).__breathingSystem = breathingSystemRef.current;
        }
        
        // Phase 2: Initialize convergence overlay
        convergenceOverlayRef.current = new ConvergenceOverlay(overlayContainer);
        
        // Phase 3: Initialize new overlays with dynamic capacities
        const q = getQualitySettings(deviceTier, shouldReduceQuality(metrics));
        flowFieldOverlayRef.current = new FlowFieldOverlay(overlayContainer, q.maxArrows);
        convergenceLanesRef.current = new ConvergenceLanes(overlayContainer, q.maxLanes);
        momentumBadgeRef.current = new MomentumBadge(overlayContainer);
        
        // Phase 3B: Initialize atmospheric overlays with dynamic capacities
        const pressureCapacity = Math.floor(P3B.PRESSURE.MAX_CELLS * (q.maxArrows / P3.FLOW.MAX_ARROWS));
        pressureOverlayRef.current = new PressureOverlay(overlayContainer, app.renderer, pressureCapacity);
        stormOverlayRef.current = new StormOverlay(overlayContainer);
        
        // Phase 4: Initialize atmospheric memory & mood overlays based on flags
        if (phase4Flags.winds_enabled) {
          const windsCapacity = Math.min(
            (q.maxWindPaths ?? P4.WINDS.MAX_PATHS) * 20,
            tradeWindOverlayRef.current?.getMaxCapacity?.() ?? Infinity
          );
          tradeWindOverlayRef.current = new TradeWindOverlay(overlayContainer, windsCapacity);
          
          // Apply initial quality settings
          tradeWindOverlayRef.current.setQuality({
            tier: deviceTier,
            maxArrows: windsCapacity,
            strideBase: deviceTier === 'low' ? 8 : deviceTier === 'high' ? 6 : 7,
            strideMin: 4,
            strideMax: 18,
          });
          
          // Seed trade winds data if empty (dev only)
          seedTradeWindsIfEmpty();
        }
        if (phase4Flags.aurora_enabled) {
          auroraOverlayRef.current = new AuroraOverlay(overlayContainer);
          
          // Apply initial quality settings
          auroraOverlayRef.current.setQuality({
            tier: deviceTier,
            maxConcurrent: deviceTier === 'low' ? 1 : deviceTier === 'high' ? 3 : 2,
            intensityMin: deviceTier === 'low' ? 0.8 : P4.AURORA.INTENSITY_MIN,
            shader: deviceTier === 'high', // Reserved for future shader path
          });
        }
        if (phase4Flags.tint_enabled) {
          atmoTintOverlayRef.current = new AtmoTintOverlay(app.stage, app.renderer); // Full-screen tint
        }

        // Social Weather System: Initialize altitude controller and new overlays
        altitudeControllerRef.current = new AltitudeController();
        lightningOverlayRef.current = new LightningOverlay(overlayContainer);
        precipOverlayRef.current = new PrecipOverlay(overlayContainer, app.renderer);
        vibeCompassOverlayRef.current = new VibeCompassOverlay(overlayContainer);
        socialWeatherTrackerRef.current = new SocialWeatherTracker();
        
        
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
      const pixiAppToDestroy = app; // Capture the app reference
      if (!pixiAppToDestroy) return;

      console.log('[FieldCanvas] Starting safe PIXI destroy');

      // Use PixiLifecycleManager for safe destruction
      import('@/lib/pixi/PixiLifecycleManager').then(({ PixiLifecycleManager }) => {
        const lifecycleManager = PixiLifecycleManager.getInstance();
        lifecycleManager.destroyApp(pixiAppToDestroy);
      });
      setPixiApp(null); // Clear state
    };

    // Hot-reload guard for development
    if (import.meta.hot) {
      import.meta.hot.dispose(safelyDestroyPixi);
    }

    return () => {
      cancelled = true; // Prevent async init completion after unmount
      safelyDestroyPixi();
    };
  }, [mapReady]); // Updated dependency

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
    const app = pixiApp; // Use state instead of ref
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
      // Frame budget tracking
      const frameStart = performance.now();
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
        return; // Skip frame - PIXI ticker will call us again
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
            count: tile.crowd_count || 1,
            vibe: 'social' as const, // TODO: Convert HSL to vibe token
            opacity: isConstellationMode ? 0.6 : 1.0
          };
        }).filter(Boolean); // Remove null entries when map not ready

        // Get clusters from worker (throttled to avoid message flood)
        if (!pending) {
          pending = true;
          requestAnimationFrame(() => {
            pending = false;
            const currentZoom = getMapInstance()?.getZoom() ?? 11;
            getClusterWorker().then(worker => worker.cluster(rawTiles, currentZoom)).then(async (clusters) => {
              // Phase 2: Calculate velocities and momentum from previous frame
              const now = performance.now();
              const prevClusters = previousClustersRef.current;
              const velocities = clusterVelocitiesRef.current;
              
              clusters.forEach(cluster => {
                const prev = prevClusters.find(p => p.id === cluster.id);
                if (prev) {
                  const dt = Math.max(0.016, (now - (prev.formationTime || now)) / 1000);
                  const vx = (cluster.x - prev.x) / dt;
                  const vy = (cluster.y - prev.y) / dt;
                  const speed = Math.hypot(vx, vy);
                  const momentum = Math.min(1, speed / 50); // Scale to 0-1
                  
                  velocities.set(cluster.id, { vx, vy, momentum });
                  cluster.momentum = momentum;
                } else {
                  velocities.set(cluster.id, { vx: 0, vy: 0, momentum: 0 });
                  cluster.momentum = 0;
                }
              });
              
              clustersRef.current = clusters;
              currentZoomRef.current = currentZoom;
              
              // Phase 2: Get convergence predictions
              let convergences: ConvergenceEvent[] = [];
              try {
                const worker = await getClusterWorker();
                const signalsResult = await worker.signals(clusters, currentZoom);
                convergences = signalsResult.convergences;
              } catch (error) {
                // Graceful fallback if signals method fails
                console.warn('[FieldCanvas] Convergence signals unavailable:', error);
              }
              
              const keysThisFrame = new Set<string>();
              const clusterSprites = new Map<string, any>();
              
              // Draw clusters with Phase 2 breathing integration
              clusters.forEach(c => {
                const key = `c:${Math.round(c.x)}:${Math.round(c.y)}`;
                keysThisFrame.add(key);
                const sprite = tilePool.acquire(key);
                if (!sprite.parent) heatContainer.addChild(sprite);
                
                sprite.position.set(c.x - c.r, c.y - c.r);
                sprite.width = sprite.height = c.r * 2;

                // Store sprite for breathing system
                clusterSprites.set(c.id, sprite);

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
                
                const vibeColor = 0x3B82F6; // TODO: Convert vibe token to color
                
                sprite.tint = vibeColor;
                sprite.alpha += (targetAlpha - sprite.alpha) * 0.2;
                
                // Phase 1: Add particle trail if cluster has momentum
                if (trailSystemRef.current && c.momentum && c.momentum > 0.5) {
                  // trailSystemRef.current.addPosition(key, c.x, c.y, c.vibe); // TODO: Fix trail integration
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

              // Phase 2: Update breathing system with pixel-space clusters (LOD + privacy gates)
              const breathingSystem = breathingSystemRef.current;
              if (breathingSystem && currentZoom >= ATMO.BREATH_ZOOM_MIN) {
                const allowedClusters = clusters.filter(c => c.count >= FIELD_LOD.K_MIN);
                if (allowedClusters.length > 0) {
                  const allowedSprites = new Map<string, any>();
                  for (const c of allowedClusters) {
                    const sprite = clusterSprites.get(c.id);
                    if (sprite) allowedSprites.set(c.id, sprite);
                  }
                  // Clusters already have x,y in pixel space from worker
                  breathingSystem.updateSprites(allowedClusters, allowedSprites, app.ticker.deltaMS);
                }
              }
              
              // Phase 2: Render convergence overlay with LOD gate
              if (convergenceOverlayRef.current && currentZoom >= ATMO.BREATH_ZOOM_MIN) {
                convergenceOverlayRef.current.render(convergences, currentZoom);
              }

              // Social Weather System: Update altitude controller and new overlays
              const altitudeController = altitudeControllerRef.current;
              if (altitudeController) {
                const activeLayers = altitudeController.computeActiveLayers(currentZoom);
                const layerAlphas = altitudeController.updateLayerAlphas(app.ticker.deltaMS);
                
                // Update Lightning overlay
                if (lightningOverlayRef.current && activeLayers.has('Lightning')) {
                  lightningOverlayRef.current.update(convergences, app.ticker.deltaMS, currentZoom);
                  lightningOverlayRef.current.setAlpha(layerAlphas.get('Lightning') ?? 0);
                }
                
                // Update Precipitation overlay  
                if (precipOverlayRef.current && activeLayers.has('Precip')) {
                  const allowedClustersForPrecip = clusters.filter(c => c.count >= FIELD_LOD.K_MIN);
                  precipOverlayRef.current.update(allowedClustersForPrecip, app.ticker.deltaMS, currentZoom, deviceTier);
                  precipOverlayRef.current.setAlpha(layerAlphas.get('Precip') ?? 0);
                }
                
                // Update Vibe Compass overlay
                if (vibeCompassOverlayRef.current && userLocation?.coords) {
                  const userScreenPos = projectToScreen(userLocation.coords.lat, userLocation.coords.lng);
                  const viewport = { width: canvasRef.current?.width ?? 800, height: canvasRef.current?.height ?? 600 };
                  vibeCompassOverlayRef.current.update(clusters, userScreenPos, viewport, app.ticker.deltaMS, currentZoom);
                }
              }
              
              // Store previous clusters for next frame velocity calculation
              previousClustersRef.current = clusters;
              
              // Debug vectors overlay (dev only)
              if (debugFieldVectors() && convergences.length > 0) {
                console.log(`[Debug] ${convergences.length} convergence events predicted`);
              }

              // Phase 2: Performance monitoring for dev
              if (import.meta.env.DEV && Math.random() < 0.01) { // 1% sample rate
                const stats = {
                  zoom: currentZoom,
                  fps: Math.round(app.ticker.FPS),
                  clusters: clusters.length,
                  convergences: convergences.length,
                  breathingStates: breathingSystem?.getStats().activeBreathingStates ?? 0,
                  particles: breathingSystem?.getStats().activeParticles ?? 0
                };
                console.log('[field.atmo] Performance stats:', stats);
              }

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

      // Frame budget check - skip non-essential overlays if frame is already heavy
      const spent = performance.now() - frameStart;
      
      // Phase 3: Essential overlays (if budget allows)
      if (spent < 6.0) {
        const now = performance.now();
        
        // Flow field (throttled based on worker fallback)
        if (now - lastFlowRef.current >= FLOW_INTERVAL_MS && flowFieldOverlayRef.current) {
          lastFlowRef.current = now;
          const t0 = performance.now();
          getClusterWorker()
            .then(w => w.flowGrid(clustersRef.current, currentZoomRef.current))
            .then(flowCells => {
              emitWorkerPerfEvent(performance.now() - t0);
              flowFieldOverlayRef.current?.update(flowCells, currentZoomRef.current);
            })
            .catch(e => { if (import.meta.env.DEV) console.warn('[flowGrid] worker error:', e); });
        }
        
        // Lanes and momentum (combined for efficiency)
        if (now - lastLaneRef.current >= LANE_INTERVAL_MS && convergenceLanesRef.current) {
          lastLaneRef.current = now;
          const t0 = performance.now();
          getClusterWorker()
            .then(w => w.lanes(clustersRef.current, currentZoomRef.current))
            .then(lanes => {
              emitWorkerPerfEvent(performance.now() - t0);
              convergenceLanesRef.current?.update(lanes, currentZoomRef.current);

              // momentum piggyback
              return getClusterWorker().then(w => w.momentum(clustersRef.current))
                .then(m => {
                  momentumBadgeRef.current?.update(
                    m,
                    currentZoomRef.current,
                    new Map(clustersRef.current.map(c => [c.id, c.count])),
                    new Map(clustersRef.current.map(c => [c.id, { x: c.x, y: c.y }]))
                  );
                  
                  // storms at same cadence from lanes
                  if (stormOverlayRef.current) {
                    return getClusterWorker().then(w => w.stormGroups(lanes, currentZoomRef.current))
                      .then(groups => {
                        lastStormGroupsRef.current = groups.map(g => ({ ...g, lastUpdate: performance.now() })); // Store for aurora detection
                        return stormOverlayRef.current?.update(groups, currentZoomRef.current);
                      });
                  }
                });
            })
            .catch(e => { if (import.meta.env.DEV) console.warn('[lanes/momentum] worker error:', e); });
        }
      }
      
      // Phase 3B: Atmospheric overlays (if budget still allows)
      const spent2 = performance.now() - frameStart;
      if (spent2 < 7.0) {
        const now = performance.now();
        
        // Pressure clouds (throttled based on worker fallback) 
        if (now - lastPressureRef.current >= PRESS_INTERVAL_MS && pressureOverlayRef.current) {
          lastPressureRef.current = now;
          const t0 = performance.now();
          getClusterWorker()
            .then(w => w.pressureGrid(clustersRef.current, currentZoomRef.current))
            .then(pcells => {
              emitWorkerPerfEvent(performance.now() - t0);
              pressureOverlayRef.current?.update(pcells, currentZoomRef.current);
            })
            .catch(e => { if (import.meta.env.DEV) console.warn('[pressureGrid] worker error:', e); });
        }
      }

      // Phase 4: Update atmospheric overlays
      const qualitySettings = getQualitySettings(deviceTier, shouldReduceQuality(metrics));
      const now = performance.now(); // Define now for Phase 4 timing
      
      // Phase 4: Trade winds (throttled to P4.WINDS.UPDATE_HZ = 2 Hz)
      if (phase4Flags.winds_enabled && tradeWindOverlayRef.current && now - lastWindsRef.current >= 1000 / P4.WINDS.UPDATE_HZ) {
        lastWindsRef.current = now;
        const t0 = performance.now();
        
        // Resolve city ID from viewport or use default
        const currentCityId = resolveFromViewport(viewportGeo);
        const bbox = currentPixelBBox(pixiApp.renderer);
        const cap = qualitySettings.maxWindPaths ?? P4.WINDS.MAX_PATHS;
        
        fetchTradeWindsForViewport({
          cityId: currentCityId,
          hour: hourBucket(new Date()),
          dow: new Date().getDay(),
          bbox,
          cap,
        })
        .then(paths => {
          emitWorkerPerfEvent(performance.now() - t0);
          tradeWindOverlayRef.current?.setCapacity(paths.length * 20);
          const visibleArrows = tradeWindOverlayRef.current?.update(paths, currentZoomRef.current, {
            fps: metrics?.fps,
            drawCalls: metrics?.drawCalls,
            workerTime: metrics?.workerTime
          }) ?? 0;
          
          // Update HUD counters with actual counts
          setPhase4HudCounters(prev => ({
            ...prev,
            windsPaths: paths.length,
            arrowsVisible: visibleArrows,
          }));
          
          if (import.meta.env.DEV && paths.length > 0) {
            console.log('[winds] Updated with', paths.length, 'trade wind paths,', visibleArrows, 'visible arrows');
          }
        })
        .catch(e => {
          if (import.meta.env.DEV) console.warn('[winds] fetch error:', e);
          // Graceful fallback to empty array
          const visibleArrows = tradeWindOverlayRef.current?.update([], currentZoomRef.current, {
            fps: metrics?.fps,
            drawCalls: metrics?.drawCalls,
            workerTime: metrics?.workerTime
          }) ?? 0;
          
          setPhase4HudCounters(prev => ({
            ...prev,
            windsPaths: 0,
            arrowsVisible: visibleArrows,
          }));
        });
      }
      
      if (phase4Flags.aurora_enabled && auroraOverlayRef.current) {
        const auroraEvents = detectAurorasFromStorms(lastStormGroupsRef.current ?? [], {
          minIntensity: auroraOverlayRef.current.getQuality().intensityMin,
          maxConcurrent: 3, 
          zoom: currentZoomRef.current
        });
        const activeAurora = auroraOverlayRef.current.update(auroraEvents, currentZoomRef.current);
        auroraOverlayRef.current.autoTune({ fps: metrics?.fps }, activeAurora);
        setPhase4HudCounters(prev => ({
          ...prev,
          auroraActive: activeAurora,
        }));
      }
      
      if (phase4Flags.tint_enabled && atmoTintOverlayRef.current) {
        atmoTintOverlayRef.current.update(new Date());
      }

      // Apply weather modulation to overlays (subtle effects)
      if (phase4Flags.weather_enabled && weather) {
        // Modulate pressure alpha based on precipitation
        if (pressureOverlayRef.current) {
          // pressureOverlayRef.current.setAlphaMod(modulation.precipMod); // TODO: Add alpha modulation
        }
        
        // Log weather conditions for debugging (once per update)
        if (import.meta.env.DEV && Math.random() < 0.001) {
          console.log('[Weather] Current conditions:', {
            condition: weather.condition,
            precip: weather.precipitationMm,
            vis: weather.visibilityKm,
            modulation
          });
        }
      }

      // Performance mark: First successful render completed
      if (!firstRenderCompleted) {
        performance.mark('field_overlay_first_render_end');
        if (performance.getEntriesByName('field_overlay_init_start').length > 0) {
          performance.measure('field_overlay_first_render_ms', 'field_overlay_init_start', 'field_overlay_first_render_end');
        }
        firstRenderCompleted = true;
      }

      // PIXI ticker handles next frame - no RAF needed
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
          // Phase 2: Clean breathing system
          if (breathingSystemRef.current) {
            breathingSystemRef.current.destroy();
          }
          // Phase 4: Clean atmospheric overlays
          tradeWindOverlayRef.current?.destroy();
          auroraOverlayRef.current?.destroy();
          atmoTintOverlayRef.current?.destroy();
        } catch (e) {
          console.warn('[CLEANUP] Error clearing containers:', e);
        }
        
        // 3️⃣ Destroy the PIXI Application after cleanup - idempotent
        const app = pixiApp;
        setPixiApp(null);
        if (!app) return;
        
        try {
          // Clear pooled sprite maps to prevent texture leaks
          if (floqSpritesRef.current) {
            floqSpritesRef.current.forEach(sprite => sprite.destroy());
            floqSpritesRef.current.clear();
          }
          
          app.ticker?.stop();
          app.stage?.removeChildren();
          app.destroy(true);
        } catch (e) {
          console.warn('[CLEANUP] Error destroying PIXI app:', e);
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

  // Update overlay quality settings when device tier changes
  useEffect(() => {
    if (!pixiApp) return;
    
    const q = getQualitySettings(deviceTier, shouldReduceQuality(metrics));
    
    // Update winds overlay quality
    if (tradeWindOverlayRef.current) {
      const windsCapacity = Math.min(
        (q.maxWindPaths ?? P4.WINDS.MAX_PATHS) * 20,
        tradeWindOverlayRef.current.getMaxCapacity()
      );
      tradeWindOverlayRef.current.setQuality({
        tier: deviceTier,
        maxArrows: windsCapacity,
        strideBase: deviceTier === 'low' ? 8 : deviceTier === 'high' ? 6 : 7,
        strideMin: 4,
        strideMax: 18,
      });
    }
    
    // Update aurora overlay quality
    if (auroraOverlayRef.current) {
      auroraOverlayRef.current.setQuality({
        tier: deviceTier,
        maxConcurrent: deviceTier === 'low' ? 1 : deviceTier === 'high' ? 3 : 2,
        intensityMin: deviceTier === 'low' ? 0.8 : P4.AURORA.INTENSITY_MIN,
        shader: deviceTier === 'high',
      });
      auroraOverlayRef.current.setTuner({
        enabled: deviceTier !== 'low', // keep off on very low devices
        target: deviceTier === 'high' ? 2 : 1,  // per-tier desired actives
        min: 0.65, max: 0.9,
        stepUp: 0.02, stepDown: 0.01,
        cooldownMs: 1500,
      });
    }
  }, [deviceTier, pixiApp, metrics]);

  // Reset worker on projection changes (resize, DPR change)
  useEffect(() => {
    const handleResize = async () => {
      const app = pixiApp;
      if (app) {
        app.renderer.resize(window.innerWidth, window.innerHeight);
        // Reset worker state to prevent velocity spikes across projection changes
        try {
          getClusterWorker().then(worker => worker.reset());
        } catch (error) {
          console.warn('[field.atmo] Worker reset failed:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize winds data logger (DEV/staging only)
  useEffect(() => {
    if (!user?.id) return;
    
    // Helper to build a light snapshot for logging with real velocity data
    const getClustersForLogger = () => {
      const out: Array<{x:number;y:number;vx:number;vy:number}> = [];
      const curr = clustersRef.current ?? [];
      const dt = Math.max(16, pixiApp?.ticker?.deltaMS ?? 100); // ms
      
      for (const c of curr) {
        const velocity = clusterVelocitiesRef.current.get(c.id);
        const vx = velocity ? velocity.vx : 0;
        const vy = velocity ? velocity.vy : 0;
        out.push({ x: c.x, y: c.y, vx, vy });
      }
      return out;
    };
    
    // Resolve city ID (use viewport resolver or default)
    const resolveCityId = (): string => {
      return resolveFromViewport(viewportGeo) || 'default';
    };
    
    const detach = startWindsLogger({
      enabled: import.meta.env.DEV || import.meta.env.VITE_WINDS_LOGGER === '1',
      cityId: resolveCityId(),
      getClusters: getClustersForLogger,
    });
    
    return detach;
  }, [pixiApp, viewportGeo]); // Remove user?.id dependency for anonymous access

  // DEV: Keyboard shortcut for manual winds refresh (Shift+W)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'W') {
        e.preventDefault();
        devRefreshWindsNow();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          app={pixiApp}
          container={constellationContainerRef.current}
        />
      )}
      
      {/* Debug info */}
      {/* tooltip portal */}
      <AnimatePresence>
        {tooltip && <ClusterTooltip {...tooltip} />}
      </AnimatePresence>
      
      {/* Phase 4 Debug HUD */}
      <Phase4Hud 
        metrics={{
          fps: metrics?.fps,
          workerTime: metrics?.workerTime,
          drawCalls: metrics?.drawCalls,
        }}
        counters={phase4HudCounters}
      />
    </>
  );
});
