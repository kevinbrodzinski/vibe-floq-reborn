import React from 'react';
import { YStack, Text } from 'tamagui';

export type WaveMarker = { id: string; lat: number; lng: number; size: number; friends: number };
export default function WaveMapNative({ lat, lng, markers }: { lat: number; lng: number; markers: WaveMarker[] }) {
  // TODO: integrate react-native-maps; placeholder only to keep types aligned with web
  return (
    <YStack padding="$3" backgroundColor="$color2" br="$4">
      <Text opacity={0.7}>Map (native) placeholder @ {lat.toFixed(4)}, {lng.toFixed(4)}</Text>
      {markers.map(m => (
        <Text key={m.id}>• {m.lat.toFixed(4)},{m.lng.toFixed(4)} · size {m.size} · friends {m.friends}</Text>
      ))}
    </YStack>
  );
}