import React from 'react';

// Use dynamic imports to avoid bundling issues on web
let MapView: any = null;
let Marker: any = null;
let View: any = null;

// Only import React Native components if we're actually in a React Native environment
if (typeof window !== 'undefined' && (window as any).Expo) {
  try {
    const RNMaps = require('react-native-maps');
    const RN = require('react-native');
    MapView = RNMaps.MapView || RNMaps.default;
    Marker = RNMaps.Marker;
    View = RN.View;
  } catch (e) {
    console.warn('React Native Maps not available:', e);
  }
}

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number; venueName?: string };

export default function WaveMapNative({ lat, lng, markers, onSelect }: {
  lat: number; lng: number; markers: WaveMarker[]; onSelect?: (m: WaveMarker) => void;
}) {
  // Fallback for web builds - return a placeholder
  if (!MapView || !Marker || !View) {
    return (
      <div className="w-full h-full bg-muted rounded-xl flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Native map (React Native only)</p>
      </div>
    );
  }

  return (
    <View style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapView
        style={{ width: '100%', height: '100%' }}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            title={m.venueName ? `Near ${m.venueName}` : `Wave size ${m.size}`}
            description={`${m.friends} friends`}
            onPress={() => onSelect?.(m)}
          />
        ))}
      </MapView>
    </View>
  );
}