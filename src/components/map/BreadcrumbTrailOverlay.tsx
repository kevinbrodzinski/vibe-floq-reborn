import React, { useMemo } from 'react';
import { useBreadcrumbTrail } from '@/hooks/useBreadcrumbTrail';
// Map instance will be passed as prop for now
import { createBreadcrumbSpec, installBreadcrumbThemeWatcher } from '@/lib/map/overlays/breadcrumbSpec';

interface BreadcrumbTrailOverlayProps {
  map: mapboxgl.Map | null;
}

/**
 * Overlay component for displaying breadcrumb trails on the map
 * Shows dotted lines between recently visited venues
 */
export function BreadcrumbTrailOverlay({ map }: BreadcrumbTrailOverlayProps) {
  const { currentPath, hasRecentPath } = useBreadcrumbTrail();

  // Create GeoJSON from current path
  const geoJson = useMemo(() => {
    if (!currentPath || !hasRecentPath) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = [];
    const venues = currentPath.venues;

    // Add venue point features
    venues.forEach((venue, index) => {
      features.push({
        type: 'Feature',
        properties: {
          type: 'venue',
          name: venue.name,
          visitedAt: venue.visitedAt,
          order: index
        },
        geometry: {
          type: 'Point',
          coordinates: [venue.lng, venue.lat]
        }
      });
    });

    // Add path line feature if we have multiple venues
    if (venues.length >= 2) {
      const coordinates = venues.map(venue => [venue.lng, venue.lat]);
      features.push({
        type: 'Feature',
        properties: {
          type: 'path',
          startTime: currentPath.startTime,
          endTime: currentPath.endTime,
          duration: currentPath.totalDuration
        },
        geometry: {
          type: 'LineString',
          coordinates
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features
    };
  }, [currentPath, hasRecentPath]);

  // Add/update overlay when map and data are ready
  React.useEffect(() => {
    if (!map) return;

    const spec = createBreadcrumbSpec(); // safe resolver handles placement
    
    // Mount overlay
    spec.mount(map);
    
    // Update with current data
    spec.update(map, geoJson);

    // Install theme watcher for color updates
    const themeUnsubscribe = installBreadcrumbThemeWatcher(map);

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
      themeUnsubscribe();
      spec.unmount(map);
    };
  }, [map, geoJson]);

  return null; // This is a map overlay component
}