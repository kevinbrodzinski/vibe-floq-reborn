import React, { useEffect } from 'react';
import MapboxGL from '@rnmapbox/maps';
import type { BaseMapProps } from './types';

export const NativeMap: React.FC<BaseMapProps> = ({
  onRegionChange,
  children,
}) => {
  useEffect(() => {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    if (token) {
      MapboxGL.setAccessToken(token);
    }
    MapboxGL.setTelemetryEnabled(false);
  }, []);

  return (
    <MapboxGL.MapView
      style={{ flex: 1 }}
      styleURL="mapbox://styles/mapbox/dark-v11"
      onRegionDidChange={(feature) => {
        const { visibleBounds, zoomLevel } = feature.properties;
        const [[west, south], [east, north]] = visibleBounds as [
          [number, number],
          [number, number],
        ];
        onRegionChange({
          minLat: south,
          minLng: west,
          maxLat: north,
          maxLng: east,
          zoom: zoomLevel,
        });
      }}
    >
      <MapboxGL.Camera
        zoomLevel={12}
        followUserLocation
      />
      {children}
    </MapboxGL.MapView>
  );
};