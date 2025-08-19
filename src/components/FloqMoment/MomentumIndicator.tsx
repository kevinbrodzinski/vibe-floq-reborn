import React from 'react';
import { XStack, Text, YStack } from 'tamagui';

export type MomentumState = 'gaining' | 'steady' | 'winding';

export default function MomentumIndicator({ state }: { state: MomentumState }) {
  const label = state === 'gaining' ? 'Floq is gaining steam' : state === 'winding' ? 'Floq is winding down' : 'Floq is steady';
  return (
    <XStack ai="center" gap="$2" padding="$3">
      {/* TODO: replace with animated orbit/glow (Reanimated) */}
      <YStack width={16} height={16} br="$12" backgroundColor="$accentColor" opacity={0.7} />
      <Text fontSize="$5">{label}</Text>
    </XStack>
  );
}