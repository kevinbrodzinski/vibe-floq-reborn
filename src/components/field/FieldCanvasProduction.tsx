import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { useEnhancedFieldTiles } from '@/hooks/useEnhancedFieldTiles';
import { clusterWorker } from '@/lib/clusterWorker';
import { TrailSystem } from '@/lib/field/TrailSystem';
import { ClusterPool } from '@/lib/field/ClusterPool';
import { projectToScreen, getMapInstance } from '@/lib/geo/project';
import { crowdCountToRadius } from '@/lib/geo';
import { hslToNearestVibe } from '@/lib/vibe/hslMap';
import { vibeToTint } from '@/lib/vibe/tokens';
import { FIELD_LOD, CLUSTER } from '@/lib/field/constants';
import type { SocialCluster, VibeToken } from '@/types/field';

interface FieldCanvasProductionProps {
  viewportGeo?: {
    minLat: number;
    maxLat: number;  
    minLng: number;
    maxLng: number;
  };
  className?: string;
}

// Seeded breathing phase generator
const seedPhase = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 628) / 100; // 0..6.28
};

// Throttle clustering recomputation
const throttle = (ms: number, fn: Function) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeout) return;
    timeout = setTimeout(() => { timeout = null; }, ms);
    return fn(...args);
  };
};

export const FieldCanvasProduction: React.FC<FieldCanvasProductionProps> = ({
  viewportGeo,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const trailSystemRef = useRef<TrailSystem | null>(null);
  const clusterPoolRef = useRef<ClusterPool | null>(null);
  const clustersRef = useRef<SocialCluster[]>([]);
  const prevClustersRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const currentZoomRef = useRef<number>(11);
  const lastKeyRef = useRef<string>('');

  // Get enhanced field tiles  
  const { data: enhancedTiles } = useEnhancedFieldTiles(viewportGeo);

  // Initialize PIXI app
  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new Application();
    appRef.current = app;
    let cancelled = false;

    const initApp = async () => {
      try {
        if (cancelled) return;
        
        await app.init({
          canvas: canvasRef.current!,
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x000000,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });
        
        if (cancelled) {
          app.destroy();
          return;
        }

        // Create containers
        const clusterContainer = new Container();
        const trailContainer = new Container();
        
        app.stage.addChild(trailContainer);
        app.stage.addChild(clusterContainer);
        
        // Initialize systems
        trailSystemRef.current = new TrailSystem(trailContainer);
        clusterPoolRef.current = new ClusterPool(clusterContainer);

      } catch (error) {
        console.error('[FieldCanvasProduction] PIXI init failed:', error);
        if (!cancelled) {
          app.destroy();
        }
      }
    };

    initApp();

    return () => {
      cancelled = true;
      if (trailSystemRef.current) {
        trailSystemRef.current.clearAll();
      }
      if (clusterPoolRef.current) {
        clusterPoolRef.current.destroy();
      }
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, []);

  // Update zoom and view tracking
  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    const updateZoomAndView = () => {
      currentZoomRef.current = map.getZoom();
    };

    map.on('move', updateZoomAndView);
    updateZoomAndView(); // Initial value

    return () => {
      map.off('move', updateZoomAndView);
    };
  }, []);

  // Debounced clustering check
  const shouldRecluster = useCallback((tilesKey: string, zoom: number): boolean => {
    const lod = zoom >= 16 ? 'hi' : zoom >= 13 ? 'mid' : 'low';
    const key = `${tilesKey}|${lod}`;
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      return true;
    }
    return false;
  }, []);

  // Main animation loop
  useEffect(() => {
    const app = appRef.current;
    const clusterPool = clusterPoolRef.current;
    if (!app || !clusterPool || !enhancedTiles) return;

    const animate = async () => {
      try {
        const map = getMapInstance();
        if (!map) return;

        // Map tiles to screen space using REAL centroids
        const rawTiles = enhancedTiles.map(tile => {
          // Use real centroid from server or fallback to center calculation
          const [lng, lat] = tile.center || [0, 0];
          if (lng === 0 && lat === 0) return null; // Skip invalid tiles
          
          const { x, y } = map.project([lng, lat]);
          const r = crowdCountToRadius(tile.crowd_count);
          const vibeToken = hslToNearestVibe(tile.avg_vibe.h);
          
          return {
            id: tile.tile_id,
            x,
            y,
            r,
            vibe: vibeToken as VibeToken
          };
        }).filter(Boolean) as Array<{id: string; x: number; y: number; r: number; vibe: VibeToken}>;

        // Only recluster when tiles change or LOD boundary crossed
        const tilesKey = enhancedTiles.map(t => t.tile_id).join(',');
        if (shouldRecluster(tilesKey, currentZoomRef.current)) {
          const clusters = await clusterWorker.cluster(rawTiles, currentZoomRef.current);
          clustersRef.current = clusters;
        }

        const clusters = clustersRef.current;

        // Track active cluster IDs and positions for velocity computation
        const activeIds = new Set<string>();
        const next = new Map<string, { x: number; y: number }>();
        
        // Render clusters with pooled sprites and seeded breathing
        for (const cluster of clusters) {
          const prev = prevClustersRef.current.get(cluster.id);
          const vx = prev ? (cluster.x - prev.x) / app.ticker.deltaMS : 0;
          const vy = prev ? (cluster.y - prev.y) / app.ticker.deltaMS : 0;
          const speed = Math.hypot(vx, vy);

          // Seeded breathing scale per cluster
          const breathingPhase = seedPhase(cluster.id);
          const scale = 1 + CLUSTER.MAX_BREATHING_SCALE * Math.sin(
            performance.now() * CLUSTER.BREATHING_FREQUENCY + breathingPhase
          );

          // Get pooled graphics for this cluster
          const graphics = clusterPool.get(cluster.id);
          graphics.clear();
          graphics.beginFill(vibeToTint(cluster.vibe), 0.6);
          graphics.drawCircle(0, 0, cluster.r * scale);
          graphics.endFill();
          graphics.position.set(cluster.x, cluster.y);

          // Double LOD/privacy gates for trails
          if (currentZoomRef.current >= FIELD_LOD.TRAILS_MIN_ZOOM && 
              cluster.count >= FIELD_LOD.K_MIN && 
              speed >= FIELD_LOD.MIN_SPEED) {
            trailSystemRef.current?.addPoint(
              cluster.id,
              cluster.x,
              cluster.y,
              cluster.vibe,
              cluster.count,
              currentZoomRef.current,
              speed
            );
          }

          activeIds.add(cluster.id);
          next.set(cluster.id, { x: cluster.x, y: cluster.y });
        }

        // Prune inactive clusters
        clusterPool.prune(activeIds);
        prevClustersRef.current = next;

        // Update trail system
        const avgAfterglowIntensity = enhancedTiles.reduce(
          (sum, tile) => sum + (tile.afterglow_intensity || 0.5), 0
        ) / enhancedTiles.length;
        
        trailSystemRef.current?.update(app.ticker.deltaMS, avgAfterglowIntensity);

      } catch (error) {
        console.error('[FieldCanvasProduction] Animation error:', error);
      }
    };

    // Use PIXI ticker only (no RAF)
    app.ticker.add(animate);

    return () => {
      app.ticker.remove(animate);
    };
  }, [enhancedTiles, shouldRecluster]);

  // Observability metrics (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const app = appRef.current;
    if (!app) return;

    const logMetrics = throttle(1000, () => {
      const stats = trailSystemRef.current?.getStats();
      const poolStats = clusterPoolRef.current?.getStats();
      
      console.log('[FieldCanvas] Performance metrics:', {
        zoom: currentZoomRef.current,
        trails: stats?.activeTrails ?? 0,
        segments: stats?.totalSegments ?? 0,
        poolSize: poolStats?.poolSize ?? 0,
        deltaMS: app.ticker.deltaMS,
        fps: Math.round(app.ticker.FPS)
      });
    });

    app.ticker.add(logMetrics);

    return () => {
      app.ticker.remove(logMetrics);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      }}
    />
  );
};