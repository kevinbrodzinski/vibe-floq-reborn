import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import { useEnhancedFieldTiles } from '@/hooks/useEnhancedFieldTiles';
import { clusterWorker } from '@/lib/clusterWorker';
import { TrailSystem } from '@/lib/field/TrailSystem';
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

export const FieldCanvasProduction: React.FC<FieldCanvasProductionProps> = ({
  viewportGeo,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const trailSystemRef = useRef<TrailSystem | null>(null);
  const clustersRef = useRef<SocialCluster[]>([]);
  const prevClustersRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const currentZoomRef = useRef<number>(11);

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
        
        // Initialize trail system
        trailSystemRef.current = new TrailSystem(trailContainer);

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
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, []);

  // Update zoom tracking
  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    const updateZoom = () => {
      currentZoomRef.current = map.getZoom();
    };

    map.on('zoom', updateZoom);
    updateZoom(); // Initial value

    return () => {
      map.off('zoom', updateZoom);
    };
  }, []);

  // Main animation loop
  useEffect(() => {
    const app = appRef.current;
    if (!app || !enhancedTiles) return;

    const animate = async () => {
      try {
        // Map tiles to screen space and convert HSL to vibe tokens
        const rawTiles = enhancedTiles.map(tile => {
          // Project tile center to screen coordinates
          const projection = projectToScreen(
            // Note: Need actual centroid data from backend
            // For now using tile center as approximation
            Number(tile.tile_id.substring(0, 6)) * 0.0001, // Mock lat from tile_id
            Number(tile.tile_id.substring(6, 12)) * 0.0001  // Mock lng from tile_id
          );
          
          if (!projection) return null;
          
          const { x, y } = projection;
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

        // Cluster tiles
        const clusters = await clusterWorker.cluster(rawTiles, currentZoomRef.current);
        clustersRef.current = clusters;

        // Clear previous cluster graphics
        const clusterContainer = app.stage.children[1] as Container;
        clusterContainer.removeChildren();

        // Track positions for velocity computation
        const next = new Map<string, { x: number; y: number }>();
        
        // Render clusters with seeded breathing and velocity computation
        for (const cluster of clusters) {
          const prev = prevClustersRef.current.get(cluster.id);
          const vx = prev ? (cluster.x - prev.x) / app.ticker.deltaMS : 0;
          const vy = prev ? (cluster.y - prev.y) / app.ticker.deltaMS : 0;
          const speed = Math.hypot(vx, vy);

          // Seeded breathing scale
          const breathingPhase = seedPhase(cluster.id);
          const scale = 1 + CLUSTER.MAX_BREATHING_SCALE * Math.sin(
            performance.now() * CLUSTER.BREATHING_FREQUENCY + breathingPhase
          );

          // Render cluster
          const graphics = new Graphics();
          graphics.beginFill(vibeToTint(cluster.vibe), 0.6);
          graphics.drawCircle(0, 0, cluster.r * scale);
          graphics.endFill();
          graphics.position.set(cluster.x, cluster.y);
          clusterContainer.addChild(graphics);

          // Add trail points with double LOD/privacy gates
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

          next.set(cluster.id, { x: cluster.x, y: cluster.y });
        }

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
  }, [enhancedTiles]);

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