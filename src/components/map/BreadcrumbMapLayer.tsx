import React, { useEffect, useMemo } from 'react';
import { useBreadcrumbTrail } from '@/hooks/useBreadcrumbTrail';
import { createBreadcrumbSpec, installBreadcrumbThemeWatcher } from '@/lib/map/overlays/breadcrumbSpec';
import { layerManager } from '@/lib/map/LayerManager';
import { onEvent, Events } from '@/services/eventBridge';

interface BreadcrumbMapLayerProps {
  map: mapboxgl.Map | null;
}

export function BreadcrumbMapLayer({ map }: BreadcrumbMapLayerProps) {
  const { currentPath, hasRecentPath } = useBreadcrumbTrail();
  const [enabled, setEnabled] = React.useState(() => {
    try {
      const stored = localStorage.getItem('floq:layers:breadcrumb-trail:enabled');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // Listen to layer toggle events
  useEffect(() => {
    const off1 = onEvent(Events.FLOQ_LAYER_TOGGLE, (payload) => {
      if (payload?.id === 'breadcrumb-trail') {
        setEnabled(payload.enabled);
      }
    });

    const off2 = onEvent(Events.FLOQ_LAYER_SET, (payload) => {
      if (payload?.id === 'breadcrumb-trail') {
        setEnabled(payload.enabled);
      }
    });

    return () => { off1(); off2(); };
  }, []);

  // Convert path to GeoJSON
  const geoJson = useMemo(() => {
    if (!currentPath || !hasRecentPath || !enabled) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = [];

    // Add venue markers
    currentPath.venues.forEach((venue, index) => {
      features.push({
        type: 'Feature',
        properties: {
          type: 'venue',
          name: venue.name,
          index,
          visitedAt: venue.visitedAt,
          duration: venue.duration || 0
        },
        geometry: {
          type: 'Point',
          coordinates: [venue.lng, venue.lat]
        }
      });
    });

    // Add path lines between venues
    if (currentPath.venues.length >= 2) {
      const coordinates = currentPath.venues.map(venue => [venue.lng, venue.lat]);
      features.push({
        type: 'Feature',
        properties: {
          type: 'path',
          venueCount: currentPath.venues.length,
          totalDuration: currentPath.totalDuration
        },
        geometry: {
          type: 'LineString',
          coordinates
        }
      });
    }

    return { type: 'FeatureCollection', features };
  }, [currentPath, hasRecentPath, enabled]);

  // Register/update overlay
  useEffect(() => {
    if (!map) return;

    const spec = createBreadcrumbSpec(); // safe resolver handles placement
    let themeUnsubscribe: (() => void) | undefined;
    
    if (enabled) {
      layerManager.register(spec);
      layerManager.apply(spec.id, geoJson);
      
      // Install theme watcher for color updates
      themeUnsubscribe = installBreadcrumbThemeWatcher(map);

      // Handle style reloads (map.setStyle() wipes layers)
      const reapply = () => {
        if (!map.isStyleLoaded()) {
          map.once('idle', reapply); // idle fires after sources/layers loaded
          return;
        }
        spec.mount(map);
        if (geoJson) spec.update(map, geoJson);
        // Theme watcher will reapply colors automatically
      };

      map.on('styledata', reapply);
      map.on('load', reapply);

      return () => {
        map.off('styledata', reapply);
        map.off('load', reapply);
        themeUnsubscribe?.();
        layerManager.unregister(spec.id);
      };
    } else {
      layerManager.unregister(spec.id);
    }
  }, [map, enabled, geoJson]);

  return null;
}