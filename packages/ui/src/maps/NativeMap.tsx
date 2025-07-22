import React from 'react';
import MapboxGL from '@rnmapbox/maps';

MapboxGL.setAccessToken(process.env.MAPBOX_ACCESS_TOKEN!);

export interface BaseMapProps {
  onRegionChange: (b: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
}

export const NativeMap: React.FC<BaseMapProps> = ({
  onRegionChange,
  children,
}) => (
  <MapboxGL.MapView
    style={{ flex: 1 }}
    styleURL="mapbox://styles/mapbox/dark-v11"
  >
    <MapboxGL.Camera
      zoomLevel={12}
      followUserLocation
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
    />
    {children}
  </MapboxGL.MapView>
);