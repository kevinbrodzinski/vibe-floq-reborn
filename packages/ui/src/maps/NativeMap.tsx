import React, { useEffect } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { ActivityIndicator } from 'react-native';
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

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#888'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px' }}>🗺️</div>
          <div>Loading map...</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Mapbox token required
          </div>
        </div>
      </div>
    );
  }

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