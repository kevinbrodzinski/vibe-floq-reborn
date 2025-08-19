import React from 'react';
import { ScrollView, YStack, XStack, Text, Card } from 'tamagui';

export type Stop = { id: string; name: string; eta?: string | null };
export default function UpcomingStopsCarousel({ stops }: { stops: Stop[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
      <XStack gap="$3">
        {stops.map((s) => (
          <Card key={s.id} padding="$3" minWidth={180}>
            <YStack gap="$1">
              <Text fontWeight="700">{s.name}</Text>
              {!!s.eta && <Text opacity={0.7}>ETA {s.eta}</Text>}
            </YStack>
          </Card>
        ))}
      </XStack>
    </ScrollView>
  );
}