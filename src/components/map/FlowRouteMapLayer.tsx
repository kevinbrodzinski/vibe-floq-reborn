import React, { useEffect, useState, useMemo } from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createFlowRouteSpec } from '@/lib/map/overlays/flowRouteSpec';
import { useFlowRoute } from '@/hooks/useFlowRoute';
import { onEvent, Events } from '@/services/eventBridge';
import { resolveVibeHex } from '@/lib/vibes/vibeColorResolver';
import type mapboxgl from 'mapbox-gl';

interface FlowRouteMapLayerProps {
  map: mapboxgl.Map | null;
}

type RoutePoint = {
  id: string;
  position: [number, number];
  venueId?: string;
  venueName?: string;
  duration?: number;
  timestamp: number;
  pathToNext?: [number, number][];
  vibeKey?: string;
  vibeHex?: string;
};

export function FlowRouteMapLayer({ map }: FlowRouteMapLayerProps) {
  const { flowRoute, isRetracing, currentRetraceIndex } = useFlowRoute();
  const [visible, setVisible] = useState(true);

  // Register layer spec when map is available
  useEffect(() => {
    if (!map) return;
    layerManager.register(createFlowRouteSpec());
    return () => layerManager.unregister('flow-route');
  }, [map]);

  // Listen for Flow events (new) and breadcrumb events (legacy compatibility)
  useEffect(() => {
    const offFlowShow = onEvent(Events.FLOQ_FLOW_SHOW, () => setVisible(true));
    const offFlowHide = onEvent(Events.FLOQ_FLOW_HIDE, () => setVisible(false));
    const offBreadcrumbShow = onEvent(Events.FLOQ_BREADCRUMB_SHOW, () => setVisible(true));
    const offBreadcrumbHide = onEvent(Events.FLOQ_BREADCRUMB_HIDE, () => setVisible(false));
    
    return () => {
      offFlowShow(); 
      offFlowHide(); 
      offBreadcrumbShow(); 
      offBreadcrumbHide();
    };
  }, []);

  // Build GeoJSON FeatureCollection from flow route
  const featureCollection = useMemo(() => {
    if (!visible || !flowRoute?.length) {
      return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection;
    }

    const features: GeoJSON.Feature[] = [];
    const venues = flowRoute.filter(p => p.venueId);

    // Path segments between venues (optional dashed lines)
    venues.forEach((p: RoutePoint) => {
      if (p.pathToNext && p.pathToNext.length > 1) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: p.pathToNext },
          properties: { type: 'path' },
        } as any);
      }
    });

    // Main flow line
    if (venues.length > 1) {
      const coords = venues.map(v => v.position);
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { type: 'flow', active: !!isRetracing },
      } as any);
    }

    // Venue points + labels (reverse numbering for retrace)
    venues.forEach((p: RoutePoint, i: number) => {
      // Compute vibe color if available
      const color = (p.vibeKey || p.vibeHex)
        ? resolveVibeHex({ 
            vibeKey: p.vibeKey, 
            vibeHex: p.vibeHex, 
            venueId: p.venueId, 
            venueName: p.venueName 
          })
        : undefined;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.position },
        properties: {
          type: 'venue',
          venueId: p.venueId,
          venueName: p.venueName || 'Unknown',
          duration: p.duration ?? 0,
          timestamp: p.timestamp,
          active: isRetracing && i === currentRetraceIndex,
          index: venues.length - i,
          ...(color ? { color } : {})
        },
      } as any);
    });

    return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection;
  }, [flowRoute, isRetracing, currentRetraceIndex, visible]);

  // Apply feature collection to map
  useEffect(() => {
    layerManager.apply('flow-route', featureCollection);
  }, [featureCollection]);

  // Optional: animate pulse effect during retrace
  useEffect(() => {
    if (!isRetracing) {
      try { 
        const mapInstance = (window as any).map || map;
        mapInstance?.setPaintProperty('flow:route:anim', 'line-opacity', 0); 
      } catch {}
      return;
    }

    let raf = 0;
    const start = performance.now();
    const step = () => {
      const t = (performance.now() - start) % 3000;
      const phase = t / 3000;
      const opacity = Math.max(0, Math.sin(phase * Math.PI) * 0.4);
      try {
        const mapInstance = (window as any).map || map;
        mapInstance?.setPaintProperty('flow:route:anim', 'line-opacity', opacity);
      } catch {}
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isRetracing, map]);

  return null; // This component only manages map layers
}