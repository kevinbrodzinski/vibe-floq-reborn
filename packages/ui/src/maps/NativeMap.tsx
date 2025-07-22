import React, { useEffect } from 'react';
import MapboxGL from '@rnmapbox/maps';
import type { BaseMapProps } from './types';

// Set access token and disable telemetry
const setupMapbox = () => {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (token) {
    MapboxGL.setAccessToken(token);
  }
  MapboxGL.setTelemetryEnabled(false);
};

export const NativeMap: React.FC<BaseMapProps> = ({
  onRegionChange,
  children,
}) => {
  useEffect(() => {
    setupMapbox();
  }, []);

  return (
    <MapboxGL.MapView
      style={{ flex: 1 }}
      styleURL="mapbox://styles/mapbox/dark-v11"
      onRegionDidChange={(e) => {
        const [[west, south], [east, north]] =
          e.properties.visibleBounds as [
            [number, number],
            [number, number],
          ];
        onRegionChange({
          minLat: south,
          minLng: west,
          maxLat: north,
          maxLng: east,
          zoom: e.properties.zoom,
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