import React from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View } from 'react-native';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number; venueName?: string };

export default function WaveMapNative({ lat, lng, markers, onSelect }: {
  lat: number; lng: number; markers: WaveMarker[]; onSelect?: (m: WaveMarker) => void;
}) {
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